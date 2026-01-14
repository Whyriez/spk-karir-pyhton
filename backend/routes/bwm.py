from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Kriteria, BwmComparison, BobotKriteria, User, Setting, RoleEnum
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


# --- PAKAR ROUTES: INPUT & HITUNG ---

@bwm_bp.route('/input-context', methods=['GET'])
@jwt_required()
def get_pakar_context():
    """
    Mengambil data persiapan untuk halaman Input Pakar:
    1. Global Best & Worst (dari Setting Admin)
    2. List Kriteria (sesuai role Pakar: Guru BK / Kaprodi)
    3. Inputan lama (jika ada)
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # 1. Ambil Setting Global
    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'ready': False, 'msg': 'Admin belum menentukan hasil FGD.'}), 200

    global_best = Kriteria.query.get(int(best_s.value))
    global_worst = Kriteria.query.get(int(worst_s.value))

    # 2. Filter Kriteria Sesuai Role
    # Logic: Guru BK -> 'gurubk' & 'umum', Kaprodi -> 'kaprodi' & 'umum'
    query = Kriteria.query
    if user.jenis_pakar == 'gurubk':
        query = query.filter(Kriteria.penanggung_jawab.in_(['gurubk', 'umum']))
    elif user.jenis_pakar == 'kaprodi':
        query = query.filter(Kriteria.penanggung_jawab.in_(['kaprodi', 'umum']))

    kriteria_list = query.order_by(Kriteria.kode.asc()).all()

    # 3. Ambil Inputan Lama (History)
    saved_comparisons = BwmComparison.query.filter_by(
        pakar_id=user_id,
        best_criterion_id=global_best.id
    ).all()

    saved_best_to_others = {}
    saved_others_to_worst = {}

    for item in saved_comparisons:
        if item.comparison_type.value == 'best_to_others':
            saved_best_to_others[str(item.compared_criterion_id)] = item.value
        else:
            saved_others_to_worst[str(item.compared_criterion_id)] = item.value

    return jsonify({
        'ready': True,
        'user_role': user.jenis_pakar,
        'global_best': {'id': global_best.id, 'kode': global_best.kode, 'nama': global_best.nama},
        'global_worst': {'id': global_worst.id, 'kode': global_worst.kode, 'nama': global_worst.nama},
        'kriteria_list': [{'id': k.id, 'kode': k.kode, 'nama': k.nama} for k in kriteria_list],
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
    a_bw = float(best_to_others.get(str(idx[worst_code]), 9))
    ci = ci_table.get(int(a_bw), 5.23)

    cr = ksi / ci if ci > 0 else 0

    return {code: float(w) for code, w in zip(criteria_codes, weights)}, cr, ksi


@bwm_bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_bwm_preview():
    claims = get_jwt()
    # Opsional: Cek role jika perlu

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    # Ambil Context (Best/Worst Global)
    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'msg': 'Setting BWM belum ditemukan.'}), 400

    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    # Filter Kriteria Sesuai Role (Sama seperti saat Save)
    query = Kriteria.query
    if user.jenis_pakar == 'gurubk':
        query = query.filter(Kriteria.penanggung_jawab.in_(['gurubk', 'umum']))
    elif user.jenis_pakar == 'kaprodi':
        query = query.filter(Kriteria.penanggung_jawab.in_(['kaprodi', 'umum']))

    target_kriteria = query.all()

    # Pastikan Best & Worst ikut
    global_best_obj = Kriteria.query.get(best_id)
    global_worst_obj = Kriteria.query.get(worst_id)

    if global_best_obj not in target_kriteria:
        target_kriteria.append(global_best_obj)
    if global_worst_obj not in target_kriteria:
        target_kriteria.append(global_worst_obj)

    # Mapping
    kriteria_map = {str(k.id): k.kode for k in target_kriteria}
    best_code = global_best_obj.kode
    worst_code = global_worst_obj.kode
    criteria_codes = list(kriteria_map.values())

    # Ambil Input User
    best_to_others_input = data.get('best_to_others', {})
    others_to_worst_input = data.get('others_to_worst', {})

    bto_mapped = {}
    otw_mapped = {}

    for kid_str, val in best_to_others_input.items():
        if kid_str in kriteria_map:
            bto_mapped[kriteria_map[kid_str]] = val

    for kid_str, val in others_to_worst_input.items():
        if kid_str in kriteria_map:
            otw_mapped[kriteria_map[kid_str]] = val

    try:
        final_weights, cr, ksi = calculate_bwm_weights(
            criteria_codes, best_code, worst_code, bto_mapped, otw_mapped
        )
        return jsonify({'cr': cr, 'msg': 'OK'}), 200
    except Exception as e:
        return jsonify({'msg': str(e), 'cr': None}), 400


@bwm_bp.route('/save', methods=['POST'])
@jwt_required()
def save_bwm():
    claims = get_jwt()
    if claims.get('role') != 'pakar':
        return jsonify({'msg': 'Akses ditolak.'}), 403

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    # Ambil Best & Worst dari DB (Bukan dari Input User, biar aman)
    best_s = Setting.query.filter_by(key='bwm_best_id').first()
    worst_s = Setting.query.filter_by(key='bwm_worst_id').first()

    if not best_s or not worst_s:
        return jsonify({'msg': 'Setting BWM belum ditemukan.'}), 400

    best_id = int(best_s.value)
    worst_id = int(worst_s.value)

    best_to_others_input = data.get('best_to_others', {})
    others_to_worst_input = data.get('others_to_worst', {})

    try:
        # A. PERSIAPAN DATA
        # Ambil semua kriteria untuk mapping
        # NOTE: Kita harus pakai kriteria yg relevan dengan Pakar ini untuk perhitungan bobotnya
        # Tapi secara teknis BWM butuh 'semua' item dalam satu set perbandingan.
        # Jika sistem memisahkan bobot per user, kita ambil kriteria user ini saja.

        # Sesuai logika Laravel: Ambil kriteria tanggung jawab user
        query = Kriteria.query
        if user.jenis_pakar == 'gurubk':
            query = query.filter(Kriteria.penanggung_jawab.in_(['gurubk', 'umum']))
        elif user.jenis_pakar == 'kaprodi':
            query = query.filter(Kriteria.penanggung_jawab.in_(['kaprodi', 'umum']))

        target_kriteria = query.all()

        # Kita butuh mapping ID -> Kode
        kriteria_map = {str(k.id): k.kode for k in target_kriteria}
        code_to_id = {k.kode: k.id for k in target_kriteria}

        # Ambil kode Best & Worst Global
        global_best_obj = Kriteria.query.get(best_id)
        global_worst_obj = Kriteria.query.get(worst_id)

        if global_best_obj not in target_kriteria:
            target_kriteria.append(global_best_obj)
        if global_worst_obj not in target_kriteria:
            target_kriteria.append(global_worst_obj)

        kriteria_map = {str(k.id): k.kode for k in target_kriteria}
        code_to_id = {k.kode: k.id for k in target_kriteria}

        best_code = global_best_obj.kode
        worst_code = global_worst_obj.kode

        criteria_codes = list(kriteria_map.values())

        # Pastikan Best & Worst masuk dalam list calculation (kalau mereka termasuk tanggung jawab user)
        # Jika Best/Worst itu kriteria yang TIDAK diurus user ini, logic bisa agak tricky.
        # Asumsi: Best & Worst pasti ada di list 'Umum' atau sesuai role.

        # B. MAPPING INPUT
        bto_mapped = {}
        otw_mapped = {}

        # Simpan ke DB (History Comparisons)
        # Hapus data lama untuk tipe yang sama
        BwmComparison.query.filter_by(pakar_id=user_id, best_criterion_id=best_id).delete()

        for kid_str, val in best_to_others_input.items():
            # Simpan DB
            cmp = BwmComparison(
                pakar_id=user_id, best_criterion_id=best_id, worst_criterion_id=worst_id,
                comparison_type='best_to_others', compared_criterion_id=int(kid_str), value=val
            )
            db.session.add(cmp)

            # Map untuk Hitung
            if kid_str in kriteria_map:
                bto_mapped[kriteria_map[kid_str]] = val

        for kid_str, val in others_to_worst_input.items():
            # Simpan DB
            cmp = BwmComparison(
                pakar_id=user_id, best_criterion_id=best_id, worst_criterion_id=worst_id,
                comparison_type='others_to_worst', compared_criterion_id=int(kid_str), value=val
            )
            db.session.add(cmp)

            # Map untuk Hitung
            if kid_str in kriteria_map:
                otw_mapped[kriteria_map[kid_str]] = val

        # C. HITUNG BOBOT
        final_weights, cr, ksi = calculate_bwm_weights(
            criteria_codes, best_code, worst_code, bto_mapped, otw_mapped
        )

        # Validasi CR (Consistency Ratio) sesuai Proposal Hal 28
        if cr > 0.1:
            return jsonify({
                'msg': f'Perbandingan tidak konsisten (CR: {cr:.4f} > 0.1). Mohon ulangi penilaian.',
                'cr': cr
            }), 400

        # D. SIMPAN BOBOT (BobotKriteria)
        jurusan_id = user.jurusan_id if user.jenis_pakar == 'kaprodi' else None

        # Reset Bobot Lama
        if jurusan_id:
            BobotKriteria.query.filter_by(jurusan_id=jurusan_id).delete()
        else:
            BobotKriteria.query.filter(BobotKriteria.jurusan_id.is_(None)).delete()

        for code, weight_val in final_weights.items():
            k_id = code_to_id[code]
            bk = BobotKriteria(kriteria_id=k_id, jurusan_id=jurusan_id, nilai_bobot=weight_val)
            db.session.add(bk)

        db.session.commit()
        return jsonify({'msg': 'Bobot berhasil disimpan!', 'results': final_weights}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error: ' + str(e)}), 500