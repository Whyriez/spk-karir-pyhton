from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.security import generate_password_hash
from models import db, User, Jurusan, RoleEnum

admin_pakar_bp = Blueprint('admin_pakar', __name__)


# --- LIST PAKAR ---
@admin_pakar_bp.route('', methods=['GET'], strict_slashes=False)
@admin_pakar_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_pakar():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    # Ambil user dengan role 'pakar'
    pakars = User.query.filter_by(role='pakar').order_by(User.name.asc()).all()

    data = []
    for p in pakars:
        jurusan_info = None
        if p.jurusan:
            jurusan_info = {'id': p.jurusan.id, 'nama': p.jurusan.nama_jurusan}

        data.append({
            'id': p.id,
            'username': p.username,  # NIP atau Login ID
            'name': p.name,
            'jenis_pakar': p.jenis_pakar,  # 'gurubk' atau 'kaprodi'
            'jurusan_id': p.jurusan_id,
            'jurusan': jurusan_info
        })

    return jsonify({'data': data})


# --- TAMBAH PAKAR ---
@admin_pakar_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def store_pakar():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    # Validasi Dasar
    if not data.get('username') or not data.get('name') or not data.get('jenis_pakar'):
        return jsonify({'msg': 'Username/NIP, Nama, dan Jenis Pakar wajib diisi'}), 400

    # Validasi Unik
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'msg': 'Username/NIP sudah digunakan'}), 400

    # Validasi Khusus Kaprodi
    jurusan_id = None
    if data['jenis_pakar'] == 'kaprodi':
        if not data.get('jurusan_id'):
            return jsonify({'msg': 'Kaprodi wajib memilih Jurusan'}), 400
        jurusan_id = data['jurusan_id']

    try:
        # Default Password: "password123" (Bisa diganti)
        hashed_password = generate_password_hash("password123")

        new_pakar = User(
            username=data['username'],
            password=hashed_password,
            name=data['name'],
            role=RoleEnum.pakar,
            jenis_pakar=data['jenis_pakar'],
            jurusan_id=jurusan_id
        )

        db.session.add(new_pakar)
        db.session.commit()

        return jsonify({'msg': 'Pakar berhasil ditambahkan. Password default: password123'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500


# --- EDIT PAKAR ---
@admin_pakar_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update_pakar(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    pakar = User.query.get(id)
    if not pakar: return jsonify({'msg': 'User tidak ditemukan'}), 404

    data = request.get_json()

    try:
        if 'name' in data: pakar.name = data['name']
        if 'username' in data: pakar.username = data['username']

        # Update Jenis & Jurusan
        if 'jenis_pakar' in data:
            pakar.jenis_pakar = data['jenis_pakar']

            # Jika berubah jadi Guru BK, hapus jurusan_id
            if data['jenis_pakar'] == 'gurubk':
                pakar.jurusan_id = None
            # Jika Kaprodi, update jurusan_id
            elif data['jenis_pakar'] == 'kaprodi' and 'jurusan_id' in data:
                pakar.jurusan_id = data['jurusan_id']

        # Reset Password
        if data.get('reset_password') == True:
            pakar.password = generate_password_hash("password123")

        db.session.commit()
        return jsonify({'msg': 'Data pakar berhasil diperbarui'}), 200
    except Exception as e:
        return jsonify({'msg': str(e)}), 500


# --- HAPUS PAKAR ---
@admin_pakar_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def delete_pakar(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    pakar = User.query.get(id)
    if not pakar: return jsonify({'msg': 'User tidak ditemukan'}), 404

    try:
        db.session.delete(pakar)
        db.session.commit()
        return jsonify({'msg': 'Pakar berhasil dihapus'}), 200
    except Exception as e:
        return jsonify({'msg': 'Gagal menghapus data.'}), 500