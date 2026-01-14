from flask import Blueprint, request, jsonify
from models import User
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token
from sqlalchemy import or_

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Di frontend Laravel namanya 'login_id', kita samakan
    login_id = data.get('login_id')
    password = data.get('password')

    if not login_id or not password:
        return jsonify({"msg": "Login ID dan Password wajib diisi"}), 400

    # Logika 'Email OR Username OR NISN' (Sama seperti Laravel)
    user = User.query.filter(
        or_(
            User.email == login_id,
            User.username == login_id,
            User.nisn == login_id
        )
    ).first()

    # Cek password
    if not user or not check_password_hash(user.password, password):
        return jsonify({"msg": "Kredensial tidak valid (User tidak ditemukan atau password salah)"}), 401

    # Ambil string role dari Enum
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    # Buat Token JWT
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": role_str,
            "username": user.username,
            "name": user.name
        }
    )

    return jsonify({
        "msg": "Login berhasil",
        "token": access_token,  # Kita standardkan nama fieldnya 'token'
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "role": role_str,
            "email": user.email,
            "jenis_pakar": user.jenis_pakar,
            "jurusan_id": user.jurusan_id
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    # Placeholder untuk cek user yang sedang login (nanti pakai jwt_required)
    return jsonify({"msg": "User profile endpoint"})