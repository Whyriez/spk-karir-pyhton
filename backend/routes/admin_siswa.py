import pandas as pd
import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.security import generate_password_hash
from models import db, User, RoleEnum, RiwayatKelas, Periode, Jurusan,NilaiSiswa, HasilRekomendasi

admin_siswa_bp = Blueprint('admin_siswa', __name__)


# --- LIST SISWA ---
@admin_siswa_bp.route('', methods=['GET'], strict_slashes=False)
@admin_siswa_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_siswa():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    # 1. Ambil Parameter Query
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search_query = request.args.get('search', '', type=str)
    
    # PARAMETER FILTER BARU
    filter_kelas = request.args.get('kelas', '', type=str)
    filter_jurusan = request.args.get('jurusan_id', '', type=str)

    # 2. Ambil Periode Aktif untuk referensi
    periode_aktif = Periode.query.filter_by(is_active=True).first()

    # 3. Bangun Query
    query = User.query.filter_by(role='siswa')

    # Eksekusi Filter Jurusan
    if filter_jurusan:
        query = query.filter(User.jurusan_id == int(filter_jurusan))

    # Eksekusi Filter Kelas (Membutuhkan JOIN dengan RiwayatKelas)
    if filter_kelas:
        query = query.join(
            RiwayatKelas, User.id == RiwayatKelas.siswa_id
        )

        if filter_kelas == "Lulus":
            query = query.filter(
                RiwayatKelas.status_akhir == "Lulus"
            )
        else:
            if periode_aktif:
                query = query.filter(
                    RiwayatKelas.periode_id == periode_aktif.id,
                    RiwayatKelas.tingkat_kelas == filter_kelas
                )

    # Eksekusi Pencarian Nama/NISN
    if search_query:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%') # NISN
            )
        )

    # 4. Eksekusi Pagination
    paginated_siswas = query.order_by(User.username.asc()).paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for s in paginated_siswas.items: # Ambil item pada halaman aktif saja
        jurusan_nama = s.jurusan.nama_jurusan if s.jurusan else '-'

        # Cari kelas di RiwayatKelas berdasarkan Periode Aktif
        kelas_str = '-'
        status_akhir = 'Tidak Terdaftar'

        riwayat_terakhir = RiwayatKelas.query.filter_by(siswa_id=s.id).order_by(RiwayatKelas.id.desc()).first()

        if riwayat_terakhir:
            if riwayat_terakhir.status_akhir == 'Lulus':
                # Jika riwayat terakhirnya lulus, dia adalah Alumni
                kelas_str = '-' 
                status_akhir = 'Lulus'
            else:
                # Jika belum lulus, cek apakah dia ada di periode yang sedang aktif
                if periode_aktif and riwayat_terakhir.periode_id == periode_aktif.id:
                    kelas_str = riwayat_terakhir.tingkat_kelas
                    status_akhir = riwayat_terakhir.status_akhir
                else:
                    # Punya riwayat lama (dropout/berhenti/data tertinggal), tapi tidak terdaftar di periode saat ini
                    kelas_str = riwayat_terakhir.tingkat_kelas
                    status_akhir = 'Tidak Aktif'

        data.append({
            'id': s.id,
            'username': s.username,  # NISN
            'name': s.name,
            'kelas_saat_ini': kelas_str,  # Hasil lookup dari Riwayat
            'jurusan_nama': jurusan_nama,
            'jurusan_id': s.jurusan_id,
            'status_akhir_periode_ini': status_akhir,
            'created_at': s.created_at
        })

    return jsonify({
        'data': data,
        'meta': {
            'current_page': paginated_siswas.page,
            'total_pages': paginated_siswas.pages,
            'total_items': paginated_siswas.total,
            'per_page': paginated_siswas.per_page,
            'has_next': paginated_siswas.has_next,
            'has_prev': paginated_siswas.has_prev
        }
    })


# --- TAMBAH SISWA ---
@admin_siswa_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def store_siswa():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    # Validasi Input
    if not data.get('username') or not data.get('name'):
        return jsonify({'msg': 'NISN dan Nama wajib diisi'}), 400

    if not data.get('kelas') or not data.get('jurusan_id'):
        return jsonify({'msg': 'Kelas dan Jurusan wajib dipilih'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'msg': 'NISN/Username sudah digunakan'}), 400

    try:
        hashed_password = generate_password_hash("123456")

        # 1. Simpan User (Tanpa field kelas_saat_ini)
        new_siswa = User(
            username=data['username'],
            password=hashed_password,
            name=data['name'],
            role=RoleEnum.siswa,
            jurusan_id=int(data['jurusan_id'])
        )
        db.session.add(new_siswa)
        db.session.flush()  # Flush untuk mendapatkan ID user baru

        # 2. Catat Riwayat Kelas di Periode Aktif
        periode_aktif = Periode.query.filter_by(is_active=True).first()

        if periode_aktif:
            riwayat = RiwayatKelas(
                siswa_id=new_siswa.id,
                periode_id=periode_aktif.id,
                tingkat_kelas=str(data['kelas']),
                jurusan_id=int(data['jurusan_id']),
                status_akhir='Aktif'
            )
            db.session.add(riwayat)
        else:
            # Jika tidak ada periode aktif, siswa terbuat tapi belum punya kelas (status gantung)
            # Idealnya admin harus set periode aktif dulu.
            pass

        db.session.commit()

        return jsonify({'msg': 'Siswa berhasil ditambahkan dan didaftarkan ke periode aktif.'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error: ' + str(e)}), 500


# --- EDIT SISWA ---
@admin_siswa_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update_siswa(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    siswa = User.query.get(id)
    if not siswa: return jsonify({'msg': 'Siswa tidak ditemukan'}), 404

    data = request.get_json()

    try:
        if 'name' in data: siswa.name = data['name']
        if 'username' in data: siswa.username = data['username']

        # Update Jurusan di User (Karena ini atribut melekat pada siswa di SMK)
        if 'jurusan_id' in data: siswa.jurusan_id = int(data['jurusan_id'])

        # Update Kelas & Jurusan di RiwayatKelas (Periode Aktif)
        periode_aktif = Periode.query.filter_by(is_active=True).first()
        if periode_aktif:
            riwayat = RiwayatKelas.query.filter_by(
                siswa_id=siswa.id,
                periode_id=periode_aktif.id
            ).first()

            if riwayat:
                # Update riwayat yang ada
                if 'kelas' in data: riwayat.tingkat_kelas = str(data['kelas'])
                if 'jurusan_id' in data: riwayat.jurusan_id = int(data['jurusan_id'])
            else:
                # Jika siswa ada tapi belum punya riwayat di periode ini (kasus anomali), buatkan baru
                if 'kelas' in data and 'jurusan_id' in data:
                    new_riwayat = RiwayatKelas(
                        siswa_id=siswa.id,
                        periode_id=periode_aktif.id,
                        tingkat_kelas=str(data['kelas']),
                        jurusan_id=int(data['jurusan_id']),
                        status_akhir='Aktif'
                    )
                    db.session.add(new_riwayat)

        if data.get('reset_password') == True:
            siswa.password = generate_password_hash("123456")

        db.session.commit()
        return jsonify({'msg': 'Data siswa berhasil diperbarui'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 400


# --- HAPUS SISWA ---
@admin_siswa_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def delete_siswa(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    siswa = User.query.get(id)
    if not siswa: return jsonify({'msg': 'User tidak ditemukan'}), 404

    try:
        # --- HAPUS MANUAL DATA TERKAIT (PENTING) ---
        # Menghapus data anak terlebih dahulu untuk menghindari error Foreign Key
        RiwayatKelas.query.filter_by(siswa_id=siswa.id).delete()
        NilaiSiswa.query.filter_by(siswa_id=siswa.id).delete()
        HasilRekomendasi.query.filter_by(siswa_id=siswa.id).delete()

        # Baru hapus user induk
        db.session.delete(siswa)
        db.session.commit()
        return jsonify({'msg': 'Siswa berhasil dihapus'}), 200

    except Exception as e:
        db.session.rollback()
        # Tampilkan error asli untuk debugging
        print(f"Error Delete Siswa: {e}")
        return jsonify({'msg': f'Gagal menghapus siswa: {str(e)}'}), 400

@admin_siswa_bp.route('/update-status-kenaikan-bulk', methods=['POST'], strict_slashes=False)
@jwt_required()
def update_status_kenaikan_bulk():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    siswa_ids = data.get('siswa_ids', []) # Array ID: [1, 2, 5]
    status_baru = data.get('status')      # 'Tinggal Kelas' atau 'Aktif'

    if not siswa_ids or not status_baru:
        return jsonify({'msg': 'Data tidak lengkap'}), 400

    periode_aktif = Periode.query.filter_by(is_active=True).first()
    if not periode_aktif:
        return jsonify({'msg': 'Tidak ada periode aktif'}), 400

    try:
        # Update semua riwayat yang cocok sekaligus
        updated_count = RiwayatKelas.query.filter(
            RiwayatKelas.siswa_id.in_(siswa_ids),
            RiwayatKelas.periode_id == periode_aktif.id
        ).update({RiwayatKelas.status_akhir: status_baru}, synchronize_session=False)

        db.session.commit()
        return jsonify({'msg': f'{updated_count} siswa berhasil diubah menjadi {status_baru}'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error: ' + str(e)}), 500
    

@admin_siswa_bp.route('/template', methods=['GET'], strict_slashes=False)
def download_template():
    # Buat kolom header
    df = pd.DataFrame(columns=['NISN', 'Nama', 'Kelas', 'Jurusan'])
    
    # Tambahkan contoh data dummy agar user paham formatnya
    df.loc[0] = ['1234567890', 'Contoh Siswa', '10', 'Rekayasa Perangkat Lunak']
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
        
        # Auto-adjust column width (Opsional, pemanis)
        worksheet = writer.sheets['Sheet1']
        worksheet.set_column('A:A', 15) # NISN
        worksheet.set_column('B:B', 30) # Nama
        worksheet.set_column('C:C', 10) # Kelas
        worksheet.set_column('D:D', 25) # Jurusan

    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='template_siswa.xlsx'
    )

# --- [BARU] PREVIEW IMPORT ---
@admin_siswa_bp.route('/preview', methods=['POST'], strict_slashes=False)
@jwt_required()
def preview_import():
    if 'file' not in request.files:
        return jsonify({"msg": "File tidak ditemukan"}), 400

    file = request.files['file']
    try:
        df = pd.read_excel(file)
        df = df.where(pd.notnull(df), None) # Handle NaN

        # Validasi Kolom Wajib
        required_cols = ['NISN', 'Nama', 'Kelas', 'Jurusan']
        if not all(col in df.columns for col in required_cols):
            return jsonify({"msg": "Format Excel salah. Pastikan header: NISN, Nama, Kelas, Jurusan"}), 400

        # Ambil semua jurusan untuk validasi nama jurusan
        all_jurusans = {j.nama_jurusan.lower(): j.nama_jurusan for j in Jurusan.query.all()}

        preview_data = []
        for index, row in df.iterrows():
            jurusan_input = str(row.get('Jurusan', '')).strip()
            jurusan_valid = jurusan_input.lower() in all_jurusans
            
            preview_data.append({
                'nisn': str(row.get('NISN', '')),
                'nama': row.get('Nama', ''),
                'kelas': str(row.get('Kelas', '')).replace('.0', ''), # Hapus desimal jika ada
                'jurusan': jurusan_input,
                'is_jurusan_valid': jurusan_valid,
                'status': 'Valid' if jurusan_valid else 'Jurusan Tidak Dikenali'
            })

        return jsonify(preview_data), 200
    except Exception as e:
        return jsonify({"msg": f"Gagal membaca file: {str(e)}"}), 400

# --- [BARU] PROSES IMPORT FINAL ---
@admin_siswa_bp.route('/import', methods=['POST'], strict_slashes=False)
@jwt_required()
def import_siswa():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    if 'file' not in request.files:
        return jsonify({"msg": "File tidak ditemukan"}), 400

    # 1. Cek Periode Aktif (Wajib ada untuk mapping kelas)
    periode_aktif = Periode.query.filter_by(is_active=True).first()
    if not periode_aktif:
        return jsonify({"msg": "Tidak ada Periode Akademik yang aktif. Aktifkan periode dulu!"}), 400

    # 2. Persiapan Data Lookup (Agar tidak query di dalam loop)
    # Mapping Nama Jurusan (Lower) -> ID Jurusan
    jurusan_map = {j.nama_jurusan.lower(): j.id for j in Jurusan.query.all()}
    
    # List NISN yang sudah ada (untuk skip duplikat)
    existing_nisns = set(u.username for u in User.query.with_entities(User.username).all())

    file = request.files['file']
    try:
        df = pd.read_excel(file)
        success_count = 0
        skip_count = 0
        error_list = []

        hashed_password = generate_password_hash("123456") # Password default

        for index, row in df.iterrows():
            nisn = str(row.get('NISN', '')).strip().replace('.0', '')
            nama = str(row.get('Nama', '')).strip()
            kelas = str(row.get('Kelas', '')).strip().replace('.0', '')
            jurusan_nama = str(row.get('Jurusan', '')).strip()

            # Validasi Dasar
            if not nisn or not nama:
                continue

            # 1. Cek Duplikat NISN
            if nisn in existing_nisns:
                skip_count += 1
                continue # Skip jika siswa sudah ada

            # 2. Cari ID Jurusan
            jurusan_id = jurusan_map.get(jurusan_nama.lower())
            if not jurusan_id:
                error_list.append(f"Baris {index+2}: Jurusan '{jurusan_nama}' tidak ditemukan di sistem.")
                continue

            # 3. Buat User Siswa
            new_siswa = User(
                username=nisn,
                password=hashed_password,
                name=nama,
                role=RoleEnum.siswa,
                jurusan_id=jurusan_id
            )
            db.session.add(new_siswa)
            db.session.flush() # Flush untuk dapat ID Siswa baru

            # 4. Buat Riwayat Kelas (Periode Aktif)
            riwayat = RiwayatKelas(
                siswa_id=new_siswa.id,
                periode_id=periode_aktif.id,
                tingkat_kelas=kelas,
                jurusan_id=jurusan_id,
                status_akhir='Aktif'
            )
            db.session.add(riwayat)
            
            # Update cache lokal agar duplikat di file yang sama terdeteksi
            existing_nisns.add(nisn)
            success_count += 1

        db.session.commit()
        
        msg = f"Berhasil import {success_count} siswa."
        if skip_count > 0:
            msg += f" ({skip_count} dilewati karena NISN sudah ada)."
        if error_list:
            msg += " Beberapa data gagal karena Jurusan tidak cocok."

        return jsonify({"msg": msg, "errors": error_list}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Gagal Import: " + str(e)}), 500
    
@admin_siswa_bp.route('/delete-bulk', methods=['POST'], strict_slashes=False)
@jwt_required()
def delete_siswa_bulk():
    claims = get_jwt()
    if claims.get('role') != 'admin': 
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    siswa_ids = data.get('siswa_ids', []) # Menerima array [1, 2, 3]

    if not siswa_ids:
        return jsonify({'msg': 'Tidak ada data yang dipilih'}), 400

    try:
        # HAPUS MANUAL DATA TERKAIT DULU UNTUK SEMUA ID TERPILIH
        RiwayatKelas.query.filter(RiwayatKelas.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        NilaiSiswa.query.filter(NilaiSiswa.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        HasilRekomendasi.query.filter(HasilRekomendasi.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)

        # HAPUS USER INDUK (SISWA)
        User.query.filter(User.id.in_(siswa_ids)).delete(synchronize_session=False)
        
        db.session.commit()
        return jsonify({'msg': f'{len(siswa_ids)} siswa berhasil dihapus'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error Bulk Delete Siswa: {e}")
        return jsonify({'msg': f'Gagal menghapus siswa: {str(e)}'}), 500