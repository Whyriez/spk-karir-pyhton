from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash
from models import db, User, RoleEnum

admin_users_bp = Blueprint('admin_users', __name__)

# --- LIST ADMIN ---
@admin_users_bp.route('', methods=['GET'], strict_slashes=False)
@admin_users_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_admins():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    # Ambil user dengan role 'admin'
    admins = User.query.filter_by(role=RoleEnum.admin).order_by(User.name.asc()).all()

    data = []
    for a in admins:
        data.append({
            'id': a.id,
            'username': a.username,  # Username / NIP
            'name': a.name
        })

    return jsonify({'data': data})

# --- TAMBAH ADMIN ---
@admin_users_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def store_admin():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    if not data.get('username') or not data.get('name'):
        return jsonify({'msg': 'Username/NIP dan Nama wajib diisi'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'msg': 'Username/NIP sudah digunakan'}), 400

    try:
        # Default Password: "123456"
        hashed_password = generate_password_hash("123456")

        new_admin = User(
            username=data['username'],
            password=hashed_password,
            name=data['name'],
            role=RoleEnum.admin
        )

        db.session.add(new_admin)
        db.session.commit()

        return jsonify({'msg': 'Admin berhasil ditambahkan. Password default: 123456'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500

# --- EDIT ADMIN ---
@admin_users_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update_admin(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    admin = User.query.get(id)
    if not admin or admin.role != RoleEnum.admin: 
        return jsonify({'msg': 'Admin tidak ditemukan'}), 404

    data = request.get_json()

    try:
        if 'name' in data: admin.name = data['name']
        if 'username' in data: admin.username = data['username']

        # Reset Password
        if data.get('reset_password') == True:
            admin.password = generate_password_hash("123456")

        db.session.commit()
        return jsonify({'msg': 'Data admin berhasil diperbarui'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500

# --- HAPUS ADMIN ---
@admin_users_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def delete_admin(id):
    claims = get_jwt()
    current_user_id = get_jwt_identity()

    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    # Proteksi: Admin tidak boleh menghapus dirinya sendiri
    if current_user_id == id:
        return jsonify({'msg': 'Akses ditolak! Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan.'}), 400

    admin = User.query.get(id)
    if not admin or admin.role != RoleEnum.admin: 
        return jsonify({'msg': 'Admin tidak ditemukan'}), 404

    try:
        db.session.delete(admin)
        db.session.commit()
        return jsonify({'msg': 'Admin berhasil dihapus'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Gagal menghapus data. Pastikan data tidak berelasi dengan tabel lain.'}), 500