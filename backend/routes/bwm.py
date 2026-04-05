from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Kriteria, BwmComparison, BobotKriteria, User, Setting, RoleEnum, Jurusan
from sqlalchemy import or_
import math
import numpy as np
from scipy.optimize import linprog

bwm_bp = Blueprint('bwm', __name__)


# --- ADMIN ROUTES: SETTING FGD ---

@bwm_bp.route('/admin/setting', methods=['GET'])
@jwt_required()
def get_admin_setting():
    # Cek Role Admin
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    # Ambil Setting saat ini
    best_setting = Setting.query.filter_by(key='bwm_best_id').first()
    worst_setting = Setting.query.filter_by(key='bwm_worst_id').first()

    kriteria_list = Kriteria.query.all()

    return jsonify({
        'kriterias': [{
            'id': k.id, 'kode': k.kode, 'nama': k.nama
        } for k in kriteria_list],
        'current_best': int(best_setting.value) if best_setting and best_setting.value else None,
        'current_worst': int(worst_setting.value) if worst_setting and worst_setting.value else None,
    })

@bwm_bp.route('/admin/results', methods=['GET'])
@jwt_required()
def get_admin_results():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    from models import Jurusan # Pastikan Jurusan di-import
    
    all_jurusan = Jurusan.query.all()
    kriteria_list = Kriteria.query.all()
    kriteria_map = {k.id: k.kode for k in kriteria_list}

    hasil = []
    for jurusan in all_jurusan:
        # Ambil bobot untuk jurusan ini
        bobots = BobotKriteria.query.filter_by(jurusan_id=jurusan.id).all()
        
        # Jika ada bobotnya, masukkan ke array hasil
        if bobots:
            weights = {}
            for b in bobots:
                kode = kriteria_map.get(b.kriteria_id)
                if kode:
                    weights[kode] = b.nilai_bobot
            
            hasil.append({
                'jurusan': jurusan.nama_jurusan,
                'weights': weights
            })

    return jsonify({'hasil': hasil}), 200

@bwm_bp.route('/admin/setting', methods=['POST'])
@jwt_required()
def save_admin_setting():
    # Cek Role Admin
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    data = request.get_json()
    best_id = data.get('best_id')
    worst_id = data.get('worst_id')

    if not best_id or not worst_id:
        return jsonify({'msg': 'Best dan Worst harus dipilih!'}), 400

    if best_id == worst_id:
        return jsonify({'msg': 'Best dan Worst tidak boleh sama!'}), 400

    # Simpan ke tabel Settings
    # Helper function untuk update_or_create
    def update_setting(key, val):
        setting = Setting.query.filter_by(key=key).first()
        if not setting:
            setting = Setting(key=key)
        setting.value = str(val)
        db.session.add(setting)

    update_setting('bwm_best_id', best_id)
    update_setting('bwm_worst_id', worst_id)

    db.session.commit()
    return jsonify({'msg': 'Hasil FGD berhasil dikunci!'}), 200

@bwm_bp.route('/admin/status', methods=['GET'])
@jwt_required()
def get_bwm_status():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    # 1. Ambil Setting Global
    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'ready': False, 'msg': 'Best/Worst Reference belum diset.'}), 200

    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    # 2. Ambil Semua Kriteria & Data Inputan
    all_kriteria = Kriteria.query.all()
    comparisons = BwmComparison.query.filter_by(
        best_criterion_id=best_id,
        worst_criterion_id=worst_id
    ).all()

    # 3. Mapping Data Input
    # Kita butuh tahu kriteria mana yang SUDAH punya nilai Best-to-Others DAN Others-to-Worst
    has_bto = set()
    has_otw = set()

    for c in comparisons:
        if c.comparison_type.value == 'best_to_others':
            has_bto.add(c.compared_criterion_id)
        elif c.comparison_type.value == 'others_to_worst':
            has_otw.add(c.compared_criterion_id)

    # 4. Cek Kelengkapan per Kriteria
    missing_items = []
    
    for k in all_kriteria:
        # LOGIC:
        # - Jika kriteria ini adalah BEST, dia tidak butuh input Best-to-Others (otomatis 1).
        # - Jika kriteria ini adalah WORST, dia tidak butuh input Others-to-Worst (otomatis 1).
        
        is_best = (k.id == best_id)
        is_worst = (k.id == worst_id)

        missing_types = []
        
        # Cek Best -> Kriteria
        if not is_best and k.id not in has_bto:
            missing_types.append("Perbandingan Best-to-Others")

        # Cek Kriteria -> Worst
        if not is_worst and k.id not in has_otw:
            missing_types.append("Perbandingan Others-to-Worst")

        if missing_types:
            missing_items.append({
                'kode': k.kode,
                'nama': k.nama,
                'penanggung_jawab': k.penanggung_jawab, # Supaya admin tahu siapa yg harus ditegur
                'missing': missing_types
            })

    # Cek apakah Bobot sudah pernah dihitung sebelumnya
    existing_weights = BobotKriteria.query.count()

    return jsonify({
        'ready': len(missing_items) == 0,
        'missing_items': missing_items,
        'has_existing_weights': existing_weights > 0,
        'total_kriteria': len(all_kriteria),
        'total_input': len(comparisons)
    })


@bwm_bp.route('/admin/calculate-final', methods=['POST'])
@jwt_required()
def calculate_final_bwm():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'msg': 'Konfigurasi BWM (Best/Worst) belum lengkap'}), 400

    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    # 1. Ambil Data Inputan dari Guru BK (Sifatnya Global untuk semua jurusan)
    guru_bk_users = User.query.filter_by(role=RoleEnum.pakar, jenis_pakar='gurubk').all()
    bk_ids = [u.id for u in guru_bk_users]

    bk_comparisons = BwmComparison.query.filter(
        BwmComparison.best_criterion_id == best_id,
        BwmComparison.worst_criterion_id == worst_id,
        BwmComparison.pakar_id.in_(bk_ids)
    ).all()

    # 2. Siapkan data Master Kriteria & Jurusan
    all_jurusan = Jurusan.query.all()
    all_kriteria = Kriteria.query.all()
    kriteria_map = {str(k.id): k.kode for k in all_kriteria}
    code_to_id = {k.kode: k.id for k in all_kriteria}

    best_obj = Kriteria.query.get(best_id)
    worst_obj = Kriteria.query.get(worst_id)
    criteria_codes = list(kriteria_map.values())

    hasil_per_jurusan = []
    error_jurusan = []

    try:
        # Hapus semua bobot lama (Reset) sebelum menghitung ulang
        BobotKriteria.query.delete()

        # 3. LOOPING PER JURUSAN: Hitung bobot untuk masing-masing jurusan
        for jurusan in all_jurusan:
            # Cari akun Kaprodi untuk jurusan ini
            kaprodi = User.query.filter_by(role=RoleEnum.pakar, jenis_pakar='kaprodi', jurusan_id=jurusan.id).first()

            kaprodi_comparisons = []
            if kaprodi:
                kaprodi_comparisons = BwmComparison.query.filter_by(
                    best_criterion_id=best_id,
                    worst_criterion_id=worst_id,
                    pakar_id=kaprodi.id
                ).all()

            if not kaprodi or not kaprodi_comparisons:
                continue

            gabungan_comparisons = bk_comparisons + kaprodi_comparisons

            bto_mapped = {}
            otw_mapped = {}

            for c in gabungan_comparisons:
                kid_str = str(c.compared_criterion_id)
                if kid_str in kriteria_map:
                    code = kriteria_map[kid_str]
                    val = c.value
                    if c.comparison_type.value == 'best_to_others':
                        bto_mapped[code] = val
                    else:
                        otw_mapped[code] = val

            # Jika data kosong (Kaprodi/BK belum ngisi sama sekali), catat error
            if not bto_mapped or not otw_mapped:
                error_jurusan.append({'jurusan': jurusan.nama_jurusan, 'error': 'Data penilaian belum lengkap (Kosong)'})
                continue

            # 4. Hitung Algoritma BWM
            try:
                final_weights, cr, ksi = calculate_bwm_weights(
                    criteria_codes, best_obj.kode, worst_obj.kode, bto_mapped, otw_mapped
                )

                # 5. Simpan Hasilnya dengan JURUSAN_ID
                for code, weight in final_weights.items():
                    bk = BobotKriteria(
                        kriteria_id=code_to_id[code],
                        nilai_bobot=weight,
                        jurusan_id=jurusan.id # <--- INI KUNCINYA
                    )
                    db.session.add(bk)

                hasil_per_jurusan.append({
                    'jurusan': jurusan.nama_jurusan,
                    'cr': cr,
                    'status': 'Sukses' if cr <= 0.1 else 'CR > 0.1 (Kurang Konsisten)'
                })

            except Exception as e:
                error_jurusan.append({'jurusan': jurusan.nama_jurusan, 'error': str(e)})

        # Evaluasi Akhir
        if len(hasil_per_jurusan) == 0:
            db.session.rollback()
            return jsonify({
                'msg': 'Tidak ada data yang dihitung. Pastikan Guru BK dan setidaknya 1 Kaprodi telah mengisi penilaian.',
                'errors': error_jurusan
            }), 400
        else:
            db.session.commit()
            return jsonify({
                'msg': f'Perhitungan Selesai! Bobot untuk {len(hasil_per_jurusan)} jurusan berhasil disimpan.',
                'hasil': hasil_per_jurusan
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Database Error: ' + str(e)}), 500

# --- PAKAR ROUTES: INPUT & HITUNG ---

@bwm_bp.route('/input-context', methods=['GET'])
@jwt_required()
def get_pakar_context():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # 1. Ambil Setting Global
    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'ready': False, 'msg': 'Admin belum menentukan hasil FGD.'}), 200

    global_best = Kriteria.query.get(int(best_s.value))
    global_worst = Kriteria.query.get(int(worst_s.value))

    # 2. Ambil Semua Kriteria
    all_kriteria = Kriteria.query.order_by(Kriteria.kode.asc()).all()

    # 1. Ambil inputan dari user yang sedang login (Pakar terkait)
    user_comparisons = BwmComparison.query.filter_by(
        pakar_id=user.id,
        best_criterion_id=global_best.id,
        worst_criterion_id=global_worst.id
    ).all()

    # 2. Ambil inputan dari Guru BK (Sebagai referensi kriteria global)
    bk_comparisons = []
    if user.jenis_pakar != 'gurubk':
        guru_bk = User.query.filter_by(role=RoleEnum.pakar, jenis_pakar='gurubk').first()
        if guru_bk:
            bk_comparisons = BwmComparison.query.filter_by(
                pakar_id=guru_bk.id,
                best_criterion_id=global_best.id,
                worst_criterion_id=global_worst.id
            ).all()

    # Gabungkan data untuk ditampilkan di UI
    saved_comparisons = bk_comparisons + user_comparisons

    saved_best_to_others = {}
    saved_others_to_worst = {}

    # Logic Dictionary: Jika ada 2 pakar mengisi kriteria yang sama (misal 'Umum'),
    # nilai yang terakhir diambil akan tampil. Ini wajar untuk view.
    for item in saved_comparisons:
        if item.comparison_type.value == 'best_to_others':
            saved_best_to_others[str(item.compared_criterion_id)] = item.value
        else:
            saved_others_to_worst[str(item.compared_criterion_id)] = item.value
    
    # 3. Setup Editable Flag
    kriteria_response = []
    for k in all_kriteria:
        # User hanya boleh EDIT jika kriteria ini tanggung jawabnya
        is_owner = (k.penanggung_jawab == user.jenis_pakar) or (k.penanggung_jawab == 'umum')
        
        kriteria_response.append({
            'id': k.id,
            'kode': k.kode,
            'nama': k.nama,
            'owner': k.penanggung_jawab,
            'editable': is_owner 
        })

    return jsonify({
        'ready': True,
        'user_role': user.jenis_pakar,
        'global_best': {'id': global_best.id, 'kode': global_best.kode, 'nama': global_best.nama},
        'global_worst': {'id': global_worst.id, 'kode': global_worst.kode, 'nama': global_worst.nama},
        'kriteria_list': kriteria_response,
        'saved_best_to_others': saved_best_to_others,
        'saved_others_to_worst': saved_others_to_worst
    })


# --- HELPER CALCULATION ---
def calculate_bwm_weights(criteria_codes, best_code, worst_code, best_to_others, others_to_worst):
    """
    Menghitung bobot BWM menggunakan Linear Programming Rezaei (2016).
    Sesuai revisi rumus Bab 2 Persamaan 2.3.
    """
    n = len(criteria_codes)
    idx = {code: i for i, code in enumerate(criteria_codes)}

    # Variabel keputusan: [w1, w2, ..., wn, ksi]
    c = [0] * n + [1]

    A_ub = []
    b_ub = []

    # Batasan Best-to-Others: |wb - abj * wj| <= ksi
    for code in criteria_codes:
        if code == best_code: 
            continue
            
        j_idx = idx[code]
        b_idx = idx[best_code]
        a_bj = float(best_to_others.get(str(code), 1))

        # wb - a_bj*wj - ksi <= 0
        row1 = [0] * (n + 1)
        row1[b_idx], row1[j_idx], row1[n] = 1, -a_bj, -1
        A_ub.append(row1)
        b_ub.append(0)

        # -wb + a_bj*wj - ksi <= 0
        row2 = [0] * (n + 1)
        row2[b_idx], row2[j_idx], row2[n] = -1, a_bj, -1
        A_ub.append(row2)
        b_ub.append(0)

    # Batasan Others-to-Worst: |wj - ajw * ww| <= ksi
    for code in criteria_codes:
        if code == worst_code: 
            continue  # PERBAIKAN 1: Lewati iterasi jika membandingkan Worst dengan dirinya sendiri
            
        j_idx = idx[code]
        w_idx = idx[worst_code]
        a_jw = float(others_to_worst.get(str(code), 1))

        # wj - a_jw*ww - ksi <= 0
        row1 = [0] * (n + 1)
        row1[j_idx], row1[w_idx], row1[n] = 1, -a_jw, -1
        A_ub.append(row1)
        b_ub.append(0)

        # -wj + a_jw*ww - ksi <= 0
        row2 = [0] * (n + 1)
        row2[j_idx], row2[w_idx], row2[n] = -1, a_jw, -1
        A_ub.append(row2)
        b_ub.append(0)

    # Batasan Equality: Sum(wj) = 1
    A_eq = [[1] * n + [0]]
    b_eq = [1]

    # Batasan Lower Bound: wj >= 0, ksi >= 0
    bounds = [(0, None)] * (n + 1)

    # Solve menggunakan solver 'highs' yang stabil
    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if not res.success:
        raise Exception("Optimasi BWM gagal menemukan solusi.")

    weights = res.x[:n]
    ksi = res.x[-1]

    # Hitung CR (Consistency Ratio) sesuai Tabel 2.1 Proposal Hal 29
    ci_table = {1: 0, 2: 0.44, 3: 1.0, 4: 1.63, 5: 2.3, 6: 3.0, 7: 3.73, 8: 4.47, 9: 5.23}
    
    # PERBAIKAN 2: Ambil a_bw menggunakan key kode string langsung, bukan idx integer
    a_bw = float(best_to_others.get(str(worst_code), 9))
    ci = ci_table.get(int(a_bw), 5.23)

    cr = ksi / ci if ci > 0 else 0

    return {code: float(w) for code, w in zip(criteria_codes, weights)}, cr, ksi


@bwm_bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_bwm_preview():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'msg': 'Setting BWM error.', 'cr': None}), 400

    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    # 1. Ambil input raw dari Frontend (Data live yang sedang digeser user)
    bto_input = data.get('best_to_others', {})
    otw_input = data.get('others_to_worst', {})

    # 2. LOGIKA HYBRID REAL-TIME: 
    # Jika yang mengecek adalah Kaprodi, ambil data Guru BK sebagai pelengkap matriks
    if user.jenis_pakar == 'kaprodi':
        guru_bk = User.query.filter_by(role=RoleEnum.pakar, jenis_pakar='gurubk').first()
        if guru_bk:
            bk_comparisons = BwmComparison.query.filter_by(
                pakar_id=guru_bk.id,
                best_criterion_id=best_id,
                worst_criterion_id=worst_id
            ).all()

            # Gabungkan nilai Guru BK ke dalam input kalkulasi jika belum ada
            for c in bk_comparisons:
                kid_str = str(c.compared_criterion_id)
                if c.comparison_type.value == 'best_to_others' and kid_str not in bto_input:
                    bto_input[kid_str] = c.value
                elif c.comparison_type.value == 'others_to_worst' and kid_str not in otw_input:
                    otw_input[kid_str] = c.value

    # 3. Filter hanya ID yang punya nilai > 0
    involved_ids = {best_id, worst_id} # Set, biar unik
    valid_bto = {}
    valid_otw = {}

    for kid, val in bto_input.items():
        if val and int(val) > 0:
            involved_ids.add(int(kid))
            valid_bto[kid] = int(val)

    for kid, val in otw_input.items():
        if val and int(val) > 0:
            involved_ids.add(int(kid))
            valid_otw[kid] = int(val)

    # Jika data kurang (misal Guru BK belum ngisi apa-apa dan Kaprodi maksain ngecek)
    if len(involved_ids) <= 2:
         return jsonify({'cr': None, 'msg': 'Data kriteria pelengkap dari Guru BK belum tersedia. CR belum bisa dihitung utuh.'}), 200

    relevant_kriteria = Kriteria.query.filter(Kriteria.id.in_(list(involved_ids))).all()
    kriteria_map = {str(k.id): k.kode for k in relevant_kriteria}
    
    best_obj = next((k for k in relevant_kriteria if k.id == best_id), None)
    worst_obj = next((k for k in relevant_kriteria if k.id == worst_id), None)
    
    if not best_obj or not worst_obj:
        return jsonify({'cr': None, 'msg': 'Referensi Best/Worst hilang'}), 400

    criteria_codes = list(kriteria_map.values())
    
    final_bto = {}
    final_otw = {}

    for kid_str, val in valid_bto.items():
        if kid_str in kriteria_map:
            final_bto[kriteria_map[kid_str]] = val
            
    for kid_str, val in valid_otw.items():
        if kid_str in kriteria_map:
            final_otw[kriteria_map[kid_str]] = val

    try:
        # Eksekusi perhitungan live
        weights, cr, ksi = calculate_bwm_weights(
            criteria_codes, best_obj.kode, worst_obj.kode, final_bto, final_otw
        )
        return jsonify({'cr': cr, 'msg': 'OK'}), 200
    except Exception as e:
        return jsonify({'msg': "Matriks belum lengkap: " + str(e), 'cr': None}), 200


@bwm_bp.route('/save', methods=['POST'])
@jwt_required()
def save_bwm():
    claims = get_jwt()
    if claims.get('role') != 'pakar':
        return jsonify({'msg': 'Akses ditolak.'}), 403

    user_id = get_jwt_identity()
    user = User.query.get(user_id) # Ambil data user untuk cek role
    data = request.get_json()

    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()
    
    if not best_s or not worst_s:
        return jsonify({'msg': 'Setting FGD error.'}), 400
    
    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    # --- PERUBAHAN PENTING UNTUK SAVE ---
    # Karena Frontend sekarang mengirim SEMUA data (termasuk punya Kaprodi),
    # Kita harus memfilter agar Guru BK tidak sengaja menyimpan/mengklaim data Kaprodi.
    
    # 1. Cari tahu ID kriteria mana yang BOLEH disimpan oleh user ini
    allowed_criteria_ids = []
    if user.jenis_pakar:
        # Ambil kriteria milik user atau umum
        allowed_objs = Kriteria.query.filter(
            or_(
                Kriteria.penanggung_jawab == user.jenis_pakar,
                Kriteria.penanggung_jawab == 'umum'
            )
        ).all()
        allowed_criteria_ids = [str(k.id) for k in allowed_objs]

    try:
        # 2. Hapus data lama (HANYA milik user ini)
        BwmComparison.query.filter_by(pakar_id=user_id, best_criterion_id=best_id).delete()

        # 3. Simpan Best To Others (FILTER ID)
        for kid_str, val in data.get('best_to_others', {}).items():
            # Cek apakah user berhak menyimpan nilai untuk kriteria ini
            if kid_str in allowed_criteria_ids and val and int(val) > 0:
                db.session.add(BwmComparison(
                    pakar_id=user_id, 
                    best_criterion_id=best_id, 
                    worst_criterion_id=worst_id,
                    comparison_type='best_to_others', 
                    compared_criterion_id=int(kid_str), 
                    value=val
                ))

        # 4. Simpan Others To Worst (FILTER ID)
        for kid_str, val in data.get('others_to_worst', {}).items():
            # Cek permission
             if kid_str in allowed_criteria_ids and val and int(val) > 0:
                db.session.add(BwmComparison(
                    pakar_id=user_id, 
                    best_criterion_id=best_id, 
                    worst_criterion_id=worst_id,
                    comparison_type='others_to_worst', 
                    compared_criterion_id=int(kid_str), 
                    value=val
                ))
        
        db.session.commit()
        return jsonify({'msg': 'Draft penilaian Anda berhasil disimpan.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error: ' + str(e)}), 500