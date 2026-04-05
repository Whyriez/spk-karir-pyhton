import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.utils import secure_filename
from models import db, Setting

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'], strict_slashes=False)
def index():
    # Ambil data dari DB
    settings_list = Setting.query.all()
    settings_dict = {item.key: item.value for item in settings_list}

    # Siapkan default values
    response_data = {
        'nama_sekolah': settings_dict.get('nama_sekolah', ''),
        'timezone': settings_dict.get('timezone', 'Asia/Jakarta'),
        'ganjil_bulan': settings_dict.get('ganjil_bulan', '7'),  # Default Juli
        'ganjil_tanggal': settings_dict.get('ganjil_tanggal', '1'), 
        'genap_bulan': settings_dict.get('genap_bulan', '1'),    # Default Januari
        'genap_tanggal': settings_dict.get('genap_tanggal', '1'),
        'school_logo': settings_dict.get('school_logo', None)
    }

    return jsonify(response_data)


@settings_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def update():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    # --- PERUBAHAN DISINI ---
    # List key yang diizinkan untuk diupdate
    allowed_keys = ['nama_sekolah', 'timezone', 'ganjil_bulan', 'ganjil_tanggal', 'genap_bulan', 'genap_tanggal']
    # ------------------------

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

@settings_bp.route('/uploads/<path:filename>')
def serve_uploads(filename):
    # Arahkan ke folder backend/static/uploads secara eksplisit
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    return send_from_directory(upload_folder, filename)

@settings_bp.route('/upload-logo', methods=['POST'])
@jwt_required()
def upload_logo():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Unauthorized'}), 403

    if 'logo' not in request.files:
        return jsonify({'msg': 'No file part'}), 400
    
    file = request.files['logo']
    
    if file.filename == '':
        return jsonify({'msg': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"logo_sekolah_{file.filename}")
        
        # Tentukan folder upload
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        # --- PERBAIKAN: HAPUS LOGO LAMA ---
        # Cek apakah ada logo sebelumnya di database
        existing_setting = Setting.query.filter_by(key='school_logo').first()
        
        if existing_setting and existing_setting.value:
            old_filename = existing_setting.value.split('/')[-1]
            
            if old_filename != filename:
                old_file_path = os.path.join(upload_folder, old_filename)
                
                # Hapus file fisik jika ada
                if os.path.exists(old_file_path):
                    try:
                        os.remove(old_file_path)
                        print(f"Deleted old logo: {old_filename}")
                    except Exception as e:
                        print(f"Failed to delete old logo: {e}")
        # ----------------------------------

        # Simpan File Baru
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        # Simpan URL LOGIS ke database
        logo_url = f"api/settings/uploads/{filename}"
        
        setting = Setting.query.filter_by(key='school_logo').first()
        if not setting:
            setting = Setting(key='school_logo', value=logo_url)
            db.session.add(setting)
        else:
            setting.value = logo_url
            
        db.session.commit()

        return jsonify({'msg': 'Logo berhasil diupload!', 'url': logo_url}), 200
    
    return jsonify({'msg': 'Tipe file tidak diizinkan (Gunakan PNG, JPG, SVG)'}), 400