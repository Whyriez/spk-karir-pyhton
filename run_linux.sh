#!/bin/bash
echo "========================================================"
echo "  Memulai SPK Karir (Linux Native - Single Service)"
echo "========================================================"

echo "[1/3] Membangun Frontend (React Vite)..."
cd frontend
npm install
npm run build
cd ..

echo "[2/3] Menyalin hasil build ke folder statis Backend..."
rm -rf backend/static/react
mkdir -p backend/static/react
# Menyalin seluruh isi folder dist ke static/react
cp -r frontend/dist/* backend/static/react/

echo "[3/3] Menyiapkan dan Menjalankan Backend (Python Flask)..."
cd backend
if [ ! -d "venv" ]; then
    echo "Membuat Virtual Environment baru..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "========================================================"
echo "  Aplikasi SPK Karir Berjalan di: http://localhost:5000"
echo "  Tekan CTRL+C untuk mematikan server."
echo "========================================================"
# Untuk environment Linux production, Gunicorn disarankan. 
# Jika Gunicorn tidak ada, bisa diganti dengan 'python app.py'
gunicorn -b 0.0.0.0:5000 app:app