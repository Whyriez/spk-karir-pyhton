@echo off
echo ========================================================
echo   Memulai SPK Karir (Windows Native - Single Service)
echo ========================================================

echo [1/3] Membangun Frontend (React Vite)...
cd frontend
call npm install
call npm run build
cd ..

echo [2/3] Menyalin hasil build ke folder statis Backend...
if not exist "backend\static\react" mkdir "backend\static\react"
:: Menyalin seluruh isi folder dist ke static/react
xcopy /s /y /q "frontend\dist\*" "backend\static\react\"

echo [3/3] Menyiapkan dan Menjalankan Backend (Python Flask)...
cd backend
if not exist venv (
    echo Membuat Virtual Environment baru...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo ========================================================
echo   Aplikasi SPK Karir Berjalan di: http://localhost:5000
echo   Tekan CTRL+C untuk mematikan server.
echo ========================================================
:: Menjalankan server Flask
python app.py