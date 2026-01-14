import os
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

from command import seed_db, migrate_fresh
# Import konfigurasi dan database yang sudah kita siapkan
from config import Config
from models import db

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)