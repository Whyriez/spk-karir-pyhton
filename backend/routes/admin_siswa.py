from flask import Blueprint, request, jsonify
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

    # 1. Ambil Periode Aktif untuk referensi
    periode_aktif = Periode.query.filter_by(is_active=True).first()

    # 2. Ambil semua siswa
    siswas = User.query.filter_by(role='siswa').order_by(User.username.asc()).all()

    data = []
    for s in siswas:
        jurusan_nama = s.jurusan.nama_jurusan if s.jurusan else '-'

        # LOGIKA BARU: Cari kelas di RiwayatKelas berdasarkan Periode Aktif
        kelas_str = '-'
        if periode_aktif:
            riwayat = RiwayatKelas.query.filter_by(
                siswa_id=s.id,
                periode_id=periode_aktif.id
            ).first()
            if riwayat:
                kelas_str = riwayat.tingkat_kelas

        data.append({
            'id': s.id,
            'username': s.username,  # NISN
            'name': s.name,
            'kelas_saat_ini': kelas_str,  # Hasil lookup dari Riwayat
            'jurusan_nama': jurusan_nama,
            'jurusan_id': s.jurusan_id,
            'created_at': s.created_at
        })

    return jsonify({'data': data})


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
            # HAPUS: kelas_saat_ini=str(data['kelas']), <-- Field ini sudah dihapus
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