@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Memulai SPK Karir (Windows Native - Single Service)
echo ========================================================
echo.

:: Deteksi Python path
set "PYTHON_PATH="
if exist "C:\Users\acera\AppData\Local\Microsoft\WindowsApps\python.exe" (
    set "PYTHON_PATH=C:\Users\acera\AppData\Local\Microsoft\WindowsApps\python.exe"
    echo Detected Python: !PYTHON_PATH!
) else if exist "C:\laragon\bin\python\python-3.14.2\python.exe" (
    set "PYTHON_PATH=C:\laragon\bin\python\python-3.14.2\python.exe"
    echo Detected Python: !PYTHON_PATH!
) else (
    echo ERROR: Python tidak ditemukan! Silakan install Python terlebih dahulu.
    pause
    exit /b 1
)

echo.
echo [1/3] Membangun Frontend (React Vite)...
cd frontend
call npm install
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Build frontend gagal! Silakan lihat pesan error di atas.
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo [2/3] Menyalin hasil build ke folder statis Backend...
if exist "backend\static\react" rmdir /s /q "backend\static\react"
mkdir "backend\static\react"
:: Menyalin seluruh isi folder dist ke static/react
xcopy /s /y /q "frontend\dist\*" "backend\static\react\"
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Gagal menyalin file build frontend! Pastikan folder frontend\dist ada.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Menyiapkan dan Menjalankan Backend (Python Flask)...
cd backend
if not exist venv (
    echo Membuat Virtual Environment baru...
    "!PYTHON_PATH!" -m virtualenv venv
    if !ERRORLEVEL! neq 0 (
        echo Installing virtualenv...
        "!PYTHON_PATH!" -m pip install virtualenv
        "!PYTHON_PATH!" -m virtualenv venv
    )
)
call venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Gagal activate virtual environment!
    pause
    exit /b %ERRORLEVEL%
)
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Gagal install Python dependencies! Silakan lihat pesan error di atas.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   Aplikasi SPK Karir Berjalan di: http://localhost:5000
echo   Tekan CTRL+C untuk mematikan server.
echo ========================================================
:: Menjalankan server Flask
python app.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Gagal install Python dependencies! Silakan lihat pesan error di atas.
    pause
    exit /b %ERRORLEVEL%
)