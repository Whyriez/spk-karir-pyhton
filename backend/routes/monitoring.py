import json
import random
from flask import Blueprint, request, jsonify, url_for
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import or_, and_, desc, asc
from models import db, User, HasilRekomendasi, Periode, Jurusan, RoleEnum, RiwayatKelas, NilaiSiswa, Kriteria, NilaiStaticJurusan

monitoring_bp = Blueprint('monitoring', __name__)


def paginate_response(pagination, endpoint, **kwargs):
    """
    Helper untuk membuat format pagination
    """
    links = []
    links.append({
        'url': url_for(endpoint, page=pagination.prev_num, **kwargs) if pagination.has_prev else None,
        'label': '&laquo; Previous',
        'active': False
    })

    for page_num in pagination.iter_pages(left_edge=1, right_edge=1, left_current=1, right_current=2):
        if page_num:
            links.append({
                'url': url_for(endpoint, page=page_num, **kwargs),
                'label': str(page_num),
                'active': page_num == pagination.page
            })
        else:
            links.append({'url': None, 'label': '...', 'active': False})

    links.append({
        'url': url_for(endpoint, page=pagination.next_num, **kwargs) if pagination.has_next else None,
        'label': 'Next &raquo;',
        'active': False
    })

    return {
        'current_page': pagination.page,
        'last_page': pagination.pages,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'from': (pagination.page - 1) * pagination.per_page + 1 if pagination.total > 0 else 0,
        'to': min(pagination.page * pagination.per_page, pagination.total),
        'links': links
    }


@monitoring_bp.route('/chart-data', methods=['GET'])
@jwt_required()
def get_chart_data():
    claims = get_jwt()
    current_user_id = claims.get('id')

    history = HasilRekomendasi.query.filter_by(siswa_id=current_user_id) \
        .join(Periode) \
        .order_by(asc(Periode.id)).all()

    labels = []
    studi_scores = []
    kerja_scores = []
    wirausaha_scores = []

    for h in history:
        labels.append(h.periode.nama_periode if h.periode else f"Kelas {h.tingkat_kelas}")
        studi_scores.append(round(h.skor_studi, 4))
        kerja_scores.append(round(h.skor_kerja, 4))
        wirausaha_scores.append(round(h.skor_wirausaha, 4))

    return jsonify({
        'labels': labels,
        'datasets': [
            {'label': 'Melanjutkan Studi', 'data': studi_scores, 'color': '#3b82f6'},
            {'label': 'Bekerja', 'data': kerja_scores, 'color': '#10b981'},
            {'label': 'Berwirausaha', 'data': wirausaha_scores, 'color': '#f59e0b'}
        ]
    })


@monitoring_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def index():
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    role = claims.get('role')
    
    if role not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    is_kaprodi = False
    kaprodi_jurusan_id = None
    if role == 'pakar':
        current_user = User.query.get(current_user_id)
        if current_user and current_user.jenis_pakar == 'kaprodi':
            is_kaprodi = True
            kaprodi_jurusan_id = current_user.jurusan_id

    # 1. Ambil Parameter
    search = request.args.get('search', '')
    status = request.args.get('status', 'sudah') 
    periode_id = request.args.get('periode_id')
    page = request.args.get('page', 1, type=int)
    
    # --- FILTER BARU ---
    filter_jurusan_id = request.args.get('jurusan_id', type=int)
    filter_kelas = request.args.get('kelas', '')

    # 2. Tentukan Periode
    if periode_id == '':
        # Jika dropdown "Semua Periode" dipilih
        current_periode_id = None
    elif periode_id is not None:
        # Jika memilih periode spesifik
        current_periode_id = int(periode_id)
    else:
        # Jika tidak ada parameter (default load)
        periode = Periode.query.filter_by(is_active=True).first()
        if not periode:
            periode = Periode.query.order_by(desc(Periode.id)).first()
        current_periode_id = periode.id if periode else None

    # 3. Query Data
    data_items = []
    pagination = None

    if status == 'sudah':
        # --- KASUS 1: SUDAH MENGISI ---
        # PERBAIKAN: Gunakan outerjoin untuk Jurusan agar siswa yg belum punya jurusan tidak hilang
        query = HasilRekomendasi.query.join(User).outerjoin(Jurusan, User.jurusan_id == Jurusan.id)

        if current_periode_id:
            query = query.filter(HasilRekomendasi.periode_id == current_periode_id)

        if search:
            # PERBAIKAN: Gunakan User.username karena kolom nisn tidak ada di model User
            query = query.filter(or_(
                User.name.ilike(f'%{search}%'),
                User.username.ilike(f'%{search}%')
            ))

        # Filter Tambahan (Kelas & Jurusan)
        if filter_kelas:
            query = query.filter(HasilRekomendasi.tingkat_kelas == filter_kelas)
        if filter_jurusan_id:
            query = query.filter(User.jurusan_id == filter_jurusan_id)

        # GEMBOK FILTER KAPRODI (Akan menimpa filter_jurusan_id jika user adalah kaprodi)
        if is_kaprodi and kaprodi_jurusan_id:
            query = query.filter(User.jurusan_id == kaprodi_jurusan_id)

        pagination = query.order_by(desc(HasilRekomendasi.created_at)) \
            .paginate(page=page, per_page=10, error_out=False)

        for item in pagination.items:
            history_records = HasilRekomendasi.query.filter_by(siswa_id=item.siswa_id).order_by(asc(HasilRekomendasi.tingkat_kelas)).all()
            riwayat = [{
                'kelas': h.tingkat_kelas, 
                'keputusan': h.keputusan_terbaik, 
                'periode': h.periode.nama_periode if h.periode else '-'
            } for h in history_records]

            data_items.append({
                'id': item.id,
                'siswa_id': item.siswa_id, # Pastikan ini ditambahkan
                'user': {
                    'name': item.siswa.name,
                    'nisn': item.siswa.username,
                    'jurusan': {
                        'nama_jurusan': item.siswa.jurusan.nama_jurusan if item.siswa.jurusan else '-'
                    }
                },
                'tingkat_kelas': item.tingkat_kelas or '-',
                'keputusan_terbaik': item.keputusan_terbaik,
                'skor_studi': item.skor_studi,
                'skor_kerja': item.skor_kerja,
                'skor_wirausaha': item.skor_wirausaha,
                'catatan_guru_bk': item.catatan_guru_bk,
                'riwayat_rekomendasi': riwayat # Tambahkan ini
            })

    else:
        # --- KASUS 2: BELUM MENGISI ---
        subquery = db.session.query(HasilRekomendasi.siswa_id)
        if current_periode_id:
            subquery = subquery.filter(HasilRekomendasi.periode_id == current_periode_id)

        if current_periode_id:
            join_kondisi = and_(
                RiwayatKelas.siswa_id == User.id,
                RiwayatKelas.periode_id == current_periode_id
            )
        else:
            join_kondisi = (RiwayatKelas.siswa_id == User.id)

        query = db.session.query(User, RiwayatKelas.tingkat_kelas) \
            .outerjoin(RiwayatKelas, join_kondisi) \
            .outerjoin(Jurusan, User.jurusan_id == Jurusan.id) \
            .filter(User.role == RoleEnum.siswa) \
            .filter(~User.id.in_(subquery))

        if search:
            # PERBAIKAN: Gunakan User.username karena kolom nisn tidak ada di model User
            query = query.filter(or_(
                User.name.ilike(f'%{search}%'),
                User.username.ilike(f'%{search}%')
            ))

        # Filter Tambahan (Kelas & Jurusan)
        if filter_kelas:
            query = query.filter(RiwayatKelas.tingkat_kelas == filter_kelas)
        if filter_jurusan_id:
            query = query.filter(User.jurusan_id == filter_jurusan_id)

        # GEMBOK FILTER KAPRODI
        if is_kaprodi and kaprodi_jurusan_id:
            query = query.filter(User.jurusan_id == kaprodi_jurusan_id)

        pagination = query.order_by(User.name.asc()) \
            .paginate(page=page, per_page=10, error_out=False)

        for user, tingkat_kelas in pagination.items:
            data_items.append({
                'id': user.id,
                'name': user.name,
                'nisn': user.username, # Diperbaiki agar tidak crash
                'jurusan': {
                    'nama_jurusan': user.jurusan.nama_jurusan if user.jurusan else '-'
                },
                'kelas': tingkat_kelas if tingkat_kelas else '-',
                'status': 'Belum Mengisi'
            })

    # 4. Format Pagination Response
    response_results = paginate_response(
        pagination, 'monitoring.index', 
        search=search, 
        status=status,
        periode_id=current_periode_id,
        jurusan_id=filter_jurusan_id,
        kelas=filter_kelas
    )
    response_results['data'] = data_items

    # 5. List Periode
    all_periodes = Periode.query.order_by(desc(Periode.is_active), desc(Periode.nama_periode)).all()
    periodes_data = [{'id': p.id, 'nama_periode': p.nama_periode, 'is_active': p.is_active} for p in all_periodes]

    return jsonify({
        'results': response_results,
        'periodes': periodes_data
    })

@monitoring_bp.route('/<int:siswa_id>/detail', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_detail_siswa(siswa_id):
    claims = get_jwt()
    if claims.get('role') not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    user = User.query.get_or_404(siswa_id)
    semua_kriteria = Kriteria.query.order_by(Kriteria.id.asc()).all()
    
    history_records = HasilRekomendasi.query.filter_by(siswa_id=siswa_id).order_by(asc(HasilRekomendasi.tingkat_kelas)).all()
    
    riwayat_lengkap = []
    for h in history_records:
        snapshot = h.detail_snapshot or {}
        detail_jawaban_periode = []

        # 1. PARSE SNAPSHOT HISTORIS (JIKA ADA)
        if isinstance(snapshot, list):
            if len(snapshot) > 0 and isinstance(snapshot[0], dict) and 'kriteria' in snapshot[0] and 'nilai' in snapshot[0]:
                detail_jawaban_periode = snapshot
            else:
                temp_dict = {}
                for item in snapshot:
                    if isinstance(item, dict):
                        key = item.get('kriteria_id') or item.get('id') or item.get('kode')
                        val = item.get('nilai_input') or item.get('nilai') or item.get('value')
                        if key is not None and val is not None:
                            temp_dict[str(key)] = val
                snapshot = temp_dict

        if isinstance(snapshot, dict) and not detail_jawaban_periode:
            for kriteria in semua_kriteria:
                nilai_angka = snapshot.get(kriteria.kode) or snapshot.get(str(kriteria.id))
                if nilai_angka is not None:
                    # --- Format Angka dan Label ---
                    str_nilai = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                    display_text = str_nilai
                    tipe_input_str = str(kriteria.tipe_input).split('.')[-1]
                    label_ditemukan = ""

                    if tipe_input_str == 'likert':
                        likert_map = {1: "Sangat Kurang", 2: "Kurang", 3: "Cukup", 4: "Baik", 5: "Sangat Baik"}
                        label_ditemukan = likert_map.get(int(nilai_angka), "")
                    elif tipe_input_str == 'select' and kriteria.opsi_pilihan:
                        opsi = kriteria.opsi_pilihan
                        if isinstance(opsi, str):
                            try: opsi = json.loads(opsi)
                            except: pass
                        if isinstance(opsi, list):
                            for opt in opsi:
                                if isinstance(opt, dict):
                                    opt_val = opt.get('val', opt.get('value', opt.get('id')))
                                    if opt_val is not None and float(opt_val) == float(nilai_angka):
                                        label_ditemukan = str(opt.get('label', opt.get('keterangan', opt.get('text'))))
                                        break
                        elif isinstance(opsi, dict):
                            val_key = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                            label_ditemukan = opsi.get(val_key, opsi.get(str(nilai_angka), ''))

                    if label_ditemukan:
                        display_text = f"{str_nilai} ({label_ditemukan})"

                    detail_jawaban_periode.append({
                        'kriteria': kriteria.nama,
                        'nilai': display_text
                    })

        # =========================================================
        # 2. FALLBACK JIKA SNAPSHOT KOSONG (Ambil Nilai Saat Ini)
        # =========================================================
        if not detail_jawaban_periode:
            for kriteria in semua_kriteria:
                nilai_angka = None
                
                # Mengambil langsung dari inputan terkini
                if kriteria.sumber_nilai.name == 'static_jurusan':
                    nsj = NilaiStaticJurusan.query.filter_by(jurusan_id=user.jurusan_id, kriteria_id=kriteria.id).first()
                    if nsj is not None: nilai_angka = nsj.nilai
                else:
                    ns = NilaiSiswa.query.filter_by(siswa_id=user.id, kriteria_id=kriteria.id).first()
                    if ns is not None: nilai_angka = ns.nilai_input

                if nilai_angka is not None:
                    str_nilai = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                    display_text = str_nilai
                    tipe_input_str = str(kriteria.tipe_input).split('.')[-1]
                    label_ditemukan = ""

                    if tipe_input_str == 'likert':
                        likert_map = {1: "Sangat Kurang", 2: "Kurang", 3: "Cukup", 4: "Baik", 5: "Sangat Baik"}
                        label_ditemukan = likert_map.get(int(nilai_angka), "")
                    elif tipe_input_str == 'select' and kriteria.opsi_pilihan:
                        opsi = kriteria.opsi_pilihan
                        if isinstance(opsi, str):
                            try: opsi = json.loads(opsi)
                            except: pass
                        if isinstance(opsi, list):
                            for opt in opsi:
                                if isinstance(opt, dict):
                                    opt_val = opt.get('val', opt.get('value', opt.get('id')))
                                    if opt_val is not None and float(opt_val) == float(nilai_angka):
                                        label_ditemukan = str(opt.get('label', opt.get('keterangan', opt.get('text'))))
                                        break
                        elif isinstance(opsi, dict):
                            val_key = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                            label_ditemukan = opsi.get(val_key, opsi.get(str(nilai_angka), ''))

                    if label_ditemukan:
                        display_text = f"{str_nilai} ({label_ditemukan})"

                    detail_jawaban_periode.append({
                        'kriteria': kriteria.nama,
                        'nilai': display_text
                    })

        # Masukkan hasil akhir ke dalam list riwayat
        riwayat_lengkap.append({
            'id': h.id,
            'kelas': h.tingkat_kelas,
            'periode': h.periode.nama_periode if h.periode else '-',
            'keputusan': h.keputusan_terbaik,
            'skor_studi': round(h.skor_studi, 4) if h.skor_studi else 0,
            'skor_kerja': round(h.skor_kerja, 4) if h.skor_kerja else 0,
            'skor_wirausaha': round(h.skor_wirausaha, 4) if h.skor_wirausaha else 0,
            'catatan_guru_bk': h.catatan_guru_bk,
            'detail_jawaban': detail_jawaban_periode 
        })

    return jsonify({
        'siswa': {
            'name': user.name,
            'nisn': user.username,
            'jurusan': user.jurusan.nama_jurusan if user.jurusan else '-'
        },
        'riwayat': riwayat_lengkap
    }), 200

# --- UPDATE CATATAN ---
@monitoring_bp.route('/<int:id>/catatan', methods=['POST'], strict_slashes=False)
@jwt_required()
def update_catatan(id):
    claims = get_jwt()
    if claims.get('role') not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    catatan = data.get('catatan_guru_bk')

    hasil = HasilRekomendasi.query.get_or_404(id)
    hasil.catatan_guru_bk = catatan

    db.session.commit()

    return jsonify({'msg': 'Catatan berhasil diperbarui', 'data': {
        'id': hasil.id,
        'catatan': hasil.catatan_guru_bk
    }}), 200


@monitoring_bp.route('/export-uat', methods=['GET'], strict_slashes=False)
@jwt_required()
def export_uat():
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    role = claims.get('role')

    if role not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    # --- CEK APAKAH USER ADALAH KAPRODI ---
    is_kaprodi = False
    kaprodi_jurusan_id = None
    if role == 'pakar':
        current_user = User.query.get(current_user_id)
        if current_user and current_user.jenis_pakar == 'kaprodi':
            is_kaprodi = True
            kaprodi_jurusan_id = current_user.jurusan_id

    periode_id = request.args.get('periode_id')
    
    if periode_id:
        periode = Periode.query.get(periode_id)
    else:
        periode = Periode.query.filter_by(is_active=True).first()
        if not periode:
            periode = Periode.query.order_by(desc(Periode.id)).first()

    current_periode_id = periode.id if periode else None

    # PERBAIKAN: outerjoin Jurusan
    query = HasilRekomendasi.query.join(User).outerjoin(Jurusan, User.jurusan_id == Jurusan.id)
    
    if current_periode_id:
        query = query.filter(HasilRekomendasi.periode_id == current_periode_id)

    # GEMBOK FILTER KAPRODI UNTUK EXPORT UAT
    if is_kaprodi and kaprodi_jurusan_id:
        query = query.filter(User.jurusan_id == kaprodi_jurusan_id)

    # ==================================================
    # TAMBAHKAN BARIS INI UNTUK MENGECUALIKAN ALIM SUMA
    # PERBAIKAN: Gunakan User.username karena kolom nisn tidak ada
    # ==================================================
    query = query.filter(User.username != '0046433343')

    # Ambil semua data awal
    raw_results = query.order_by(User.name.asc()).all()

    # ==================================================
    # --- PENCEGAH DUPLIKAT & FILTER NILAI DUMMY (100) ---
    # ==================================================
    results = []
    seen_siswa_ids = set()
    for item in raw_results:
        if item.siswa_id not in seen_siswa_ids:
            
            # 1. Cek apakah ada nilai input = 100
            has_score_100 = False
            nilai_siswa_list = NilaiSiswa.query.filter_by(siswa_id=item.siswa_id).all()
            for ns in nilai_siswa_list:
                if ns.nilai_input:
                    try:
                        # Jika ada satu saja kriteria (seperti rapor) yang isinya 100
                        if float(ns.nilai_input) >= 100:
                            has_score_100 = True
                            break
                    except (ValueError, TypeError):
                        pass # Abaikan jika input berupa text murni
            
            # 2. Jika dia punya nilai 100, lewati (jangan dimasukkan ke list)
            if has_score_100:
                continue

            # 3. Jika aman, masukkan ke list final
            results.append(item)
            seen_siswa_ids.add(item.siswa_id)
    # ==================================================

    # ==========================================
    # --- LOGIKA CUSTOM LIMIT & BALANCING ---
    # ==========================================
    limit_10 = request.args.get('limit_10', type=int, default=0)
    limit_11 = request.args.get('limit_11', type=int, default=0)
    limit_12 = request.args.get('limit_12', type=int, default=0)
    is_balanced = request.args.get('balanced', 'false').lower() == 'true'

    total_limit = limit_10 + limit_11 + limit_12

    # Jika user memasukkan limit, kita lakukan pemrosesan
    if total_limit > 0:
        data_by_class = {'10': [], '11': [], '12': []}
        for item in results:
            kls = str(item.tingkat_kelas)
            if kls in data_by_class:
                data_by_class[kls].append(item)
        
        limits = {'10': limit_10, '11': limit_11, '12': limit_12}
        selected_items = []

        for kls, limit in limits.items():
            if limit <= 0:
                continue
            
            items_in_class = data_by_class[kls]
            random.shuffle(items_in_class) # Acak urutan agar data bervariasi setiap kali export
            
            if not is_balanced:
                selected_items.extend(items_in_class[:limit])
            else:
                # Group by keputusan untuk balancing (Studi / Kerja / Wirausaha)
                grouped = {'Melanjutkan Studi': [], 'Bekerja': [], 'Berwirausaha': []}
                for it in items_in_class:
                    dec = str(it.keputusan_terbaik).lower()
                    if 'studi' in dec: grouped['Melanjutkan Studi'].append(it)
                    elif 'kerja' in dec: grouped['Bekerja'].append(it)
                    elif 'wirausaha' in dec: grouped['Berwirausaha'].append(it)
                    else:
                        cat = random.choice(list(grouped.keys()))
                        grouped[cat].append(it)
                        
                chosen = []
                categories = ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha']
                available_cats = [c for c in categories if len(grouped[c]) > 0]
                pointers = {c: 0 for c in categories}
                
                # Algoritma Round-Robin
                while len(chosen) < limit and available_cats:
                    for c in list(available_cats):
                        if len(chosen) >= limit:
                            break
                        
                        if pointers[c] < len(grouped[c]):
                            chosen.append(grouped[c][pointers[c]])
                            pointers[c] += 1
                        else:
                            available_cats.remove(c)
                
                selected_items.extend(chosen)
        
        results = selected_items
    # ==========================================

    semua_kriteria = Kriteria.query.order_by(Kriteria.id.asc()).all()

    data_items = []
    for item in results:
        detail_jawaban = []

        for kriteria in semua_kriteria:
            nilai_angka = None

            if kriteria.sumber_nilai.name == 'static_jurusan':
                nsj = NilaiStaticJurusan.query.filter_by(
                    jurusan_id=item.siswa.jurusan_id, 
                    kriteria_id=kriteria.id
                ).first()
                if nsj is not None:
                    nilai_angka = nsj.nilai
            else:
                ns = NilaiSiswa.query.filter_by(
                    siswa_id=item.siswa.id, 
                    kriteria_id=kriteria.id
                ).first()
                if ns is not None:
                    nilai_angka = ns.nilai_input

            if nilai_angka is None:
                continue

            str_nilai = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
            display_text = str_nilai
            tipe_input_str = str(kriteria.tipe_input).split('.')[-1]
            label_ditemukan = ""

            if tipe_input_str == 'likert':
                likert_map = {
                    1: "Sangat Kurang / Sangat Rendah",
                    2: "Kurang / Rendah",
                    3: "Cukup",
                    4: "Baik / Tinggi",
                    5: "Sangat Baik / Sangat Tinggi"
                }
                label_ditemukan = likert_map.get(int(nilai_angka), "")

            elif tipe_input_str == 'select' and kriteria.opsi_pilihan:
                opsi = kriteria.opsi_pilihan
                if isinstance(opsi, str):
                    try:
                        opsi = json.loads(opsi)
                    except json.JSONDecodeError:
                        pass
                
                if isinstance(opsi, list):
                    for opt in opsi:
                        if isinstance(opt, dict):
                            opt_val = opt.get('val', opt.get('value', opt.get('id')))
                            opt_label = opt.get('label', opt.get('keterangan', opt.get('text')))
                            if opt_val is not None:
                                try:
                                    if float(opt_val) == float(nilai_angka):
                                        label_ditemukan = str(opt_label)
                                        break
                                except (ValueError, TypeError):
                                    pass

                elif isinstance(opsi, dict):
                    val_key = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                    label_ditemukan = opsi.get(val_key, opsi.get(str(nilai_angka), ''))

            if label_ditemukan:
                display_text = f"{str_nilai} ({label_ditemukan})"

            detail_jawaban.append({
                'kriteria': kriteria.nama,
                'nilai': display_text  
            })

        data_items.append({
            'name': item.siswa.name,
            'nisn': item.siswa.username, # PERBAIKAN: Gunakan username
            'kelas': item.tingkat_kelas,
            'keputusan_terbaik': item.keputusan_terbaik,
            'detail_jawaban': detail_jawaban
        })

    return jsonify({'data': data_items}), 200


@monitoring_bp.route('/export-uat-final', methods=['GET'], strict_slashes=False)
@jwt_required()
def export_uat_final():
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    role = claims.get('role')

    if role not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    is_kaprodi = False
    kaprodi_jurusan_id = None
    if role == 'pakar':
        current_user = User.query.get(current_user_id)
        if current_user and current_user.jenis_pakar == 'kaprodi':
            is_kaprodi = True
            kaprodi_jurusan_id = current_user.jurusan_id

    periode_id = request.args.get('periode_id')
    # --- TAMBAHAN UNTUK 30 SISWA KHUSUS ---
    khusus_ids_str = request.args.get('khusus_ids', '')
    khusus_ids = [int(x.strip()) for x in khusus_ids_str.split(',')] if khusus_ids_str else []
    
    if periode_id:
        periode = Periode.query.get(periode_id)
    else:
        periode = Periode.query.filter_by(is_active=True).first()
        if not periode:
            periode = Periode.query.order_by(desc(Periode.id)).first()

    current_periode_id = periode.id if periode else None

    query = HasilRekomendasi.query.join(User).outerjoin(Jurusan, User.jurusan_id == Jurusan.id)
    
    if current_periode_id:
        query = query.filter(HasilRekomendasi.periode_id == current_periode_id)

    if is_kaprodi and kaprodi_jurusan_id:
        query = query.filter(User.jurusan_id == kaprodi_jurusan_id)

    # Variabel utama penampung data final
    results = []

    # =======================================================
    # 1. LOGIKA MODE 30 SISWA KHUSUS (TERURUT MANUAL)
    # =======================================================
    if khusus_ids:
        raw_results = query.filter(User.id.in_(khusus_ids)).all()
        
        # Buat dictionary map ID -> Objek agar mudah disusun ulang
        results_map = {}
        for item in raw_results:
            if item.siswa_id not in results_map:
                results_map[item.siswa_id] = item
        
        # Susun ulang masukkan ke 'results' sesuai urutan ID di frontend
        for sid in khusus_ids:
            if sid in results_map:
                results.append(results_map[sid])

    # =======================================================
    # 2. LOGIKA NORMAL (SEMUA SISWA, DIFILTER & BALANCING)
    # =======================================================
    else:
        query = query.filter(User.username != '0046433343')
        raw_results = query.order_by(User.name.asc()).all()

        seen_siswa_ids = set()
        for item in raw_results:
            if item.siswa_id not in seen_siswa_ids:
                has_score_100 = False
                nilai_siswa_list = NilaiSiswa.query.filter_by(siswa_id=item.siswa_id).all()
                for ns in nilai_siswa_list:
                    if ns.nilai_input:
                        try:
                            if float(ns.nilai_input) >= 100:
                                has_score_100 = True
                                break
                        except (ValueError, TypeError):
                            pass 
                
                if has_score_100:
                    continue

                results.append(item)
                seen_siswa_ids.add(item.siswa_id)

        # LOGIKA BALANCING (HANYA BERJALAN JIKA BUKAN MODE KHUSUS)
        limit_10 = request.args.get('limit_10', type=int, default=0)
        limit_11 = request.args.get('limit_11', type=int, default=0)
        limit_12 = request.args.get('limit_12', type=int, default=0)
        is_balanced = request.args.get('balanced', 'false').lower() == 'true'

        total_limit = limit_10 + limit_11 + limit_12

        if total_limit > 0:
            data_by_class = {'10': [], '11': [], '12': []}
            for item in results:
                kls = str(item.tingkat_kelas)
                if kls in data_by_class:
                    data_by_class[kls].append(item)
            
            limits = {'10': limit_10, '11': limit_11, '12': limit_12}
            selected_items = []

            for kls, limit in limits.items():
                if limit <= 0:
                    continue
                
                items_in_class = data_by_class[kls]
                random.shuffle(items_in_class) 
                
                if not is_balanced:
                    selected_items.extend(items_in_class[:limit])
                else:
                    grouped = {'Melanjutkan Studi': [], 'Bekerja': [], 'Berwirausaha': []}
                    for it in items_in_class:
                        dec = str(it.keputusan_terbaik).lower()
                        if 'studi' in dec: grouped['Melanjutkan Studi'].append(it)
                        elif 'kerja' in dec: grouped['Bekerja'].append(it)
                        elif 'wirausaha' in dec: grouped['Berwirausaha'].append(it)
                        else:
                            cat = random.choice(list(grouped.keys()))
                            grouped[cat].append(it)
                            
                    chosen = []
                    categories = ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha']
                    available_cats = [c for c in categories if len(grouped[c]) > 0]
                    pointers = {c: 0 for c in categories}
                    
                    while len(chosen) < limit and available_cats:
                        for c in list(available_cats):
                            if len(chosen) >= limit:
                                break
                            
                            if pointers[c] < len(grouped[c]):
                                chosen.append(grouped[c][pointers[c]])
                                pointers[c] += 1
                            else:
                                available_cats.remove(c)
                    
                    selected_items.extend(chosen)
            
            results = selected_items

    # =======================================================
    # 3. MENGUBAH DATA MENJADI FORMAT JSON DENGAN DETAIL KRITERIA
    # =======================================================
    semua_kriteria = Kriteria.query.order_by(Kriteria.id.asc()).all()

    data_items = []
    for item in results:
        detail_jawaban = []

        for kriteria in semua_kriteria:
            nilai_angka = None

            if kriteria.sumber_nilai.name == 'static_jurusan':
                nsj = NilaiStaticJurusan.query.filter_by(
                    jurusan_id=item.siswa.jurusan_id, 
                    kriteria_id=kriteria.id
                ).first()
                if nsj is not None:
                    nilai_angka = nsj.nilai
            else:
                ns = NilaiSiswa.query.filter_by(
                    siswa_id=item.siswa.id, 
                    kriteria_id=kriteria.id
                ).first()
                if ns is not None:
                    nilai_angka = ns.nilai_input

            if nilai_angka is None:
                continue

            str_nilai = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
            display_text = str_nilai
            tipe_input_str = str(kriteria.tipe_input).split('.')[-1]
            label_ditemukan = ""

            if tipe_input_str == 'likert':
                likert_map = {
                    1: "Sangat Kurang / Sangat Rendah",
                    2: "Kurang / Rendah",
                    3: "Cukup",
                    4: "Baik / Tinggi",
                    5: "Sangat Baik / Sangat Tinggi"
                }
                label_ditemukan = likert_map.get(int(nilai_angka), "")

            elif tipe_input_str == 'select' and kriteria.opsi_pilihan:
                opsi = kriteria.opsi_pilihan
                if isinstance(opsi, str):
                    try:
                        opsi = json.loads(opsi)
                    except json.JSONDecodeError:
                        pass
                
                if isinstance(opsi, list):
                    for opt in opsi:
                        if isinstance(opt, dict):
                            opt_val = opt.get('val', opt.get('value', opt.get('id')))
                            opt_label = opt.get('label', opt.get('keterangan', opt.get('text')))
                            if opt_val is not None:
                                try:
                                    if float(opt_val) == float(nilai_angka):
                                        label_ditemukan = str(opt_label)
                                        break
                                except (ValueError, TypeError):
                                    pass

                elif isinstance(opsi, dict):
                    val_key = str(int(nilai_angka)) if float(nilai_angka).is_integer() else str(nilai_angka)
                    label_ditemukan = opsi.get(val_key, opsi.get(str(nilai_angka), ''))

            if label_ditemukan:
                display_text = f"{str_nilai} ({label_ditemukan})"

            detail_jawaban.append({
                'kriteria': kriteria.nama,
                'nilai': display_text  
            })

        data_items.append({
            'name': item.siswa.name,
            'nisn': item.siswa.username, # PERBAIKAN: Gunakan username
            'kelas': item.tingkat_kelas,
            'keputusan_terbaik': item.keputusan_terbaik,
            'detail_jawaban': detail_jawaban
        })

    return jsonify({'data': data_items}), 200