from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Setting

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'], strict_slashes=False)
def index():
    # Ambil data dari DB
    settings_list = Setting.query.all()
    settings_dict = {item.key: item.value for item in settings_list}

    # Siapkan default values mirip Controller Laravel
    response_data = {
        'nama_sekolah': settings_dict.get('nama_sekolah', ''),
        'timezone': settings_dict.get('timezone', 'Asia/Jakarta'),
        'periode_bulan': settings_dict.get('periode_bulan', '7'),  # Default Juli
        'periode_tanggal': settings_dict.get('periode_tanggal', '1'),  # Default Tgl 1
    }

    return jsonify(response_data)


@settings_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def update():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    # List key yang diizinkan untuk diupdate
    allowed_keys = ['nama_sekolah', 'timezone', 'periode_bulan', 'periode_tanggal']

    try:
        for key in allowed_keys:
            if key in data:
                setting = Setting.query.filter_by(key=key).first()
                if setting:
                    setting.value = str(data[key])
                else:
                    new_setting = Setting(key=key, value=str(data[key]), type='text')
                    db.session.add(new_setting)

        db.session.commit()
        return jsonify({'msg': 'Pengaturan sekolah berhasil diperbarui.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500