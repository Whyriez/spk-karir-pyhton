import os
from flask_apscheduler import APScheduler
from datetime import datetime
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

from flask_jwt_extended import JWTManager
from routes.auth import auth_bp
from routes.kriteria import kriteria_bp
from routes.bwm import bwm_bp
from routes.siswa import siswa_bp
from routes.moora import moora_bp
from routes.dashboard import dashboard_bp
from routes.periode import periode_bp
from routes.jurusan import jurusan_bp
from routes.alumni import alumni_bp
from routes.monitoring import monitoring_bp
from routes.settings import settings_bp
from routes.nilai_static import nilai_static_bp
from routes.admin_siswa import admin_siswa_bp
from routes.admin_pakar import admin_pakar_bp
from routes.simulation import simulation_bp
from routes.admin_users import admin_users_bp

from command import seed_db, migrate_fresh
# Import konfigurasi dan database yang sudah kita siapkan
from config import Config
from models import db, Setting, Periode, RiwayatKelas

app = Flask(__name__, static_folder='static/react')

# 1. Load Konfigurasi dari config.py
app.config.from_object(Config)

# 2. Init Extensions
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"] # Pastikan OPTIONS diizinkan
    }
})
# CORS(app, resources={
#     r"/api/*": {
#         "origins": "http://localhost:5173",
#         "supports_credentials": True
#     }
# })
db.init_app(app)      # Sambungkan Database
migrate = Migrate(app, db) # Sambungkan Flask-Migrate

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# --- INIT JWT ---
jwt = JWTManager(app)

app.cli.add_command(seed_db)
app.cli.add_command(migrate_fresh)


app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(kriteria_bp, url_prefix='/api/kriteria')
app.register_blueprint(bwm_bp, url_prefix='/api/bwm')
app.register_blueprint(siswa_bp, url_prefix='/api/siswa')
app.register_blueprint(moora_bp, url_prefix='/api/moora')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(periode_bp, url_prefix='/api/periode')
app.register_blueprint(jurusan_bp, url_prefix='/api/jurusan')
app.register_blueprint(alumni_bp, url_prefix='/api/alumni')
app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
app.register_blueprint(settings_bp, url_prefix='/api/settings')
app.register_blueprint(nilai_static_bp, url_prefix='/api/nilai-static')
app.register_blueprint(admin_siswa_bp, url_prefix='/api/admin/siswa')
app.register_blueprint(admin_pakar_bp, url_prefix='/api/admin/pakar')
app.register_blueprint(simulation_bp, url_prefix='/api/simulation')
app.register_blueprint(admin_users_bp, url_prefix='/api/admin/users')



# --- API Routes (Contoh) ---
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "message": "Service is running",
        "platform": "Flask + React",
        "db_connected": True # Indikator simpel
    })

# --- Serve React Frontend (Catch-All Route) ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Jika request meminta file yang ada di folder static (css/js/gambar), berikan file tersebut
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)

    # Untuk route lainnya, kembalikan index.html (biarkan React Router menangani routing di client)
    if os.path.exists(app.static_folder + '/index.html'):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Fallback ramah jika build belum ada
        return jsonify({
            "error": "React build not found",
            "hint": "Please run 'npm run build' in your frontend folder and copy the result to 'static/react'"
        }), 404

@scheduler.task('cron', id='cek_periode_harian', hour=0, minute=5)
# @scheduler.task('interval', id='cek_periode_harian', seconds=5)
def cek_periode_harian():
    with app.app_context():
        # print(f"⏰ [SCHEDULER]: Mengecek jadwal periode... ({datetime.now().strftime('%H:%M:%S')})")

        sekarang = datetime.now()
        hari_ini = str(sekarang.day)
        bulan_ini = str(sekarang.month)
        tahun_ini = sekarang.year

        # Ambil pengaturan dari database
        settings = {s.key: s.value for s in Setting.query.all()}

        # 1. CEK APAKAH HARI INI JADWAL GANJIL
        if settings.get('ganjil_tanggal') == hari_ini and settings.get('ganjil_bulan') == bulan_ini:
            nama_periode_baru = f"TA {tahun_ini}/{tahun_ini+1} (Ganjil)"
            proses_otomatis_periode(nama_periode_baru, is_promotion=True)

        # 2. CEK APAKAH HARI INI JADWAL GENAP
        elif settings.get('genap_tanggal') == hari_ini and settings.get('genap_bulan') == bulan_ini:
            nama_periode_baru = f"TA {tahun_ini}/{tahun_ini+1} (Genap)"
            proses_otomatis_periode(nama_periode_baru, is_promotion=False)


def proses_otomatis_periode(nama_periode, is_promotion):
    """Fungsi untuk mengeksekusi pembuatan periode & migrasi siswa"""
    # Cek apakah periode dengan nama ini sudah ada (mencegah tereksekusi dua kali di hari yang sama)
    if Periode.query.filter_by(nama_periode=nama_periode).first():
        return

    # 1. Matikan periode lama
    periode_lama = Periode.query.filter_by(is_active=True).first()
    if periode_lama:
        periode_lama.is_active = False

    # 2. Buat periode baru & langsung aktifkan
    periode_baru = Periode(nama_periode=nama_periode, is_active=True, is_promotion_period=is_promotion)
    db.session.add(periode_baru)
    db.session.flush() # Flush untuk mendapatkan ID periode baru

    # 3. Pindahkan Siswa (Copy logika dari route activate)
    if periode_lama:
        riwayat_lama = RiwayatKelas.query.filter_by(periode_id=periode_lama.id).all()
        for r in riwayat_lama:
            next_kelas = None
            is_lulus = False

            if is_promotion:
                if r.status_akhir == 'Tinggal Kelas':
                    next_kelas = r.tingkat_kelas
                else:
                    if r.status_akhir == 'Aktif': r.status_akhir = 'Naik Kelas'
                    if r.tingkat_kelas == '10': next_kelas = '11'
                    elif r.tingkat_kelas == '11': next_kelas = '12'
                    elif r.tingkat_kelas == '12': is_lulus = True
            else:
                next_kelas = r.tingkat_kelas

            # Eksekusi status
            if is_lulus:
                r.status_akhir = 'Lulus'
            elif next_kelas:
                new_r = RiwayatKelas(
                    siswa_id=r.siswa_id,
                    periode_id=periode_baru.id,
                    tingkat_kelas=next_kelas,
                    jurusan_id=r.jurusan_id,
                    status_akhir='Aktif'
                )
                db.session.add(new_r)

    db.session.commit()
    print(f"✅ [CRONJOB BERHASIL]: {nama_periode} otomatis dibuat & siswa dimigrasi.")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)