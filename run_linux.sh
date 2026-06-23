#!/bin/bash
echo "========================================================"
echo "  Memulai SPK Karir (Linux Native - Single Service)"
echo "========================================================"

pause_and_exit() {
    local code=$1
    local msg="$2"
    echo
    echo "ERROR: $msg"
    read -r -p "Press ENTER to exit..."
    exit $code
}

echo.

## Deteksi python executable (prioritaskan python3)
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="$(command -v python)"
fi
if [ -z "$PYTHON_CMD" ]; then
    echo "ERROR: Python tidak ditemukan. Install Python 3 atau pastikan 'python3'/'python' ada di PATH."
    read -r -p "Press ENTER to exit..."
    exit 1
fi
echo "Detected Python: $PYTHON_CMD"

echo "[1/3] Membangun Frontend (React Vite)..."
cd frontend || pause_and_exit 2 "Tidak bisa masuk folder frontend"
npm install || pause_and_exit $? "npm install gagal"
npm run build || pause_and_exit $? "npm run build gagal"
cd .. || pause_and_exit 3 "Tidak bisa kembali ke root project"

echo "[2/3] Menyalin hasil build ke folder statis Backend..."
rm -rf backend/static/react
mkdir -p backend/static/react
# Menyalin seluruh isi folder dist ke static/react
if [ -d "frontend/dist" ]; then
    cp -r frontend/dist/* backend/static/react/ 2>/dev/null || pause_and_exit $? "Gagal menyalin file build frontend. Pastikan frontend/dist berisi hasil build."
else
    pause_and_exit 4 "Folder frontend/dist tidak ditemukan. Build frontend gagal atau menghasilkan folder berbeda."
fi

echo "[3/3] Menyiapkan dan Menjalankan Backend (Python Flask)..."
cd backend || pause_and_exit 5 "Tidak bisa masuk folder backend"
if [ ! -d "venv" ]; then
    echo "Membuat Virtual Environment baru..."
    $PYTHON_CMD -m venv venv 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "Modul venv tidak tersedia, mencoba virtualenv..."
        $PYTHON_CMD -m pip install --user virtualenv || pause_and_exit $? "Gagal menginstall virtualenv"
        $PYTHON_CMD -m virtualenv venv || pause_and_exit $? "Gagal membuat virtualenv"
    fi
fi
source venv/bin/activate || pause_and_exit 6 "Gagal mengaktifkan virtual environment"
pip install -r requirements.txt || pause_and_exit $? "Gagal install dependencies Python"

echo ""
echo "========================================================"
echo "  Aplikasi SPK Karir Berjalan di: http://localhost:5000"
echo "  Tekan CTRL+C untuk mematikan server."
echo "========================================================"
# Jika Gunicorn tersedia, gunakan; kalau tidak, jalankan langsung dengan Python
if command -v gunicorn >/dev/null 2>&1; then
    gunicorn -b 0.0.0.0:5000 app:app || pause_and_exit $? "Gunicorn gagal dijalankan"
else
    $PYTHON_CMD app.py || pause_and_exit $? "Aplikasi Flask gagal dijalankan"
fi