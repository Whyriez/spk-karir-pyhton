import os
from dotenv import load_dotenv

# Load environment variables dari file .env
load_dotenv()


class Config:
    # Basic Flask Config
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'default-secret-key-jika-tidak-ada'

    # Database Config
    # Kita rakit connection string untuk SQLAlchemy: mysql+pymysql://user:pass@host:port/dbname
    DB_USER = os.environ.get('DB_USERNAME', 'root')
    DB_PASS = os.environ.get('DB_PASSWORD', '')
    DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_NAME = os.environ.get('DB_DATABASE', 'spk_karir_flask')

    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'kunci_rahasia_super_aman_ganti_nanti')