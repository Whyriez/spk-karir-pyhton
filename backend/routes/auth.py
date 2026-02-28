from flask import Blueprint, request, jsonify
from models import User, db, RoleEnum, Periode, RiwayatKelas
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, create_refresh_token
from sqlalchemy import or_

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    login_id = data.get('login_id')
    password = data.get('password')

    if not login_id or not password:
        return jsonify({"msg": "Login ID dan Password wajib diisi"}), 400

    user = User.query.filter(
        or_(
            User.email == login_id,
            User.username == login_id,
            User.nisn == login_id
        )
    ).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"msg": "Kredensial tidak valid (User tidak ditemukan atau password salah)"}), 401

    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    # Buat Access Token & Refresh Token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": role_str, "username": user.username, "name": user.name}
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={"role": role_str, "username": user.username, "name": user.name}
    )

    return jsonify({
        "msg": "Login berhasil",
        "token": access_token,
        "refresh_token": refresh_token,
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


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    name = data.get('name')
    nisn = data.get('nisn')
    password = data.get('password')
    jurusan_id = data.get('jurusan_id')
    kelas = data.get('kelas') # Misal: '10', '11', atau '12'

    if not name or not nisn or not password or not jurusan_id or not kelas:
        return jsonify({"msg": "Semua field (termasuk Jurusan dan Kelas) wajib diisi"}), 400

    # Cek apakah username atau nisn sudah pernah dipakai
    existing_user = User.query.filter(
        or_(
            User.username == nisn, 
            (User.nisn == nisn) & (User.nisn != None) & (User.nisn != "")
        )
    ).first()

    if existing_user:
        return jsonify({"msg": "NISN sudah terdaftar!, Silahkan login dengan NISN tersebut"}), 400

    # Hash password
    hashed_password = generate_password_hash(password)

    # 1. Buat user baru (Role otomatis default ke siswa)
    new_user = User(
        name=name,
        username=nisn,
        nisn=nisn,
        password=hashed_password,
        role=RoleEnum.siswa,
        jurusan_id=jurusan_id
    )

    db.session.add(new_user)
    db.session.flush() # Flush agar new_user.id langsung di-generate tanpa di-commit dulu

    # 2. Cari Periode Aktif untuk memasukkan ke Riwayat Kelas
    active_periode = Periode.query.filter_by(is_active=True).first()
    
    if not active_periode:
        db.session.rollback()
        return jsonify({"msg": "Gagal mendaftar: Tidak ada Periode akademik yang aktif saat ini. Hubungi Admin."}), 400

    # 3. Buat Riwayat Kelas
    riwayat = RiwayatKelas(
        siswa_id=new_user.id,
        periode_id=active_periode.id,
        tingkat_kelas=kelas,
        jurusan_id=jurusan_id,
        status_akhir='Aktif'
    )
    db.session.add(riwayat)

    # Simpan semua perubahan ke database
    db.session.commit()

    # --- LANGSUNG AUTO-LOGIN ---
    role_str = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)

    # Buat Token JWT
    access_token = create_access_token(
        identity=str(new_user.id),
        additional_claims={
            "role": role_str,
            "username": new_user.username,
            "name": new_user.name
        }
    )

    return jsonify({
        "msg": "Registrasi berhasil",
        "token": access_token,
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "username": new_user.username,
            "role": role_str,
            "nisn": new_user.nisn,
            "jurusan_id": new_user.jurusan_id
        }
    }), 201


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    # Ambil identity dari refresh token
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"msg": "User tidak ditemukan"}), 404
        
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    # Terbitkan Access Token yang baru
    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": role_str, "username": user.username, "name": user.name}
    )
    
    return jsonify({'token': new_access_token}), 200

@auth_bp.route('/change-password', methods=['PUT'], strict_slashes=False)
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({'msg': 'User tidak ditemukan'}), 404

    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if not old_password or not new_password or not confirm_password:
        return jsonify({'msg': 'Semua field wajib diisi'}), 400

    if new_password != confirm_password:
        return jsonify({'msg': 'Password baru dan konfirmasi tidak cocok'}), 400

    if len(new_password) < 6:
        return jsonify({'msg': 'Password baru minimal 6 karakter'}), 400

    # Cek apakah password lama yang diinput cocok dengan database
    if not check_password_hash(user.password, old_password):
        return jsonify({'msg': 'Password lama salah'}), 400

    try:
        # Enkripsi dan simpan password baru
        user.password = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({'msg': 'Password berhasil diubah! Silakan gunakan password baru pada login berikutnya.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Terjadi kesalahan: ' + str(e)}), 500