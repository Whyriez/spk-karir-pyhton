# Backend - SPK Karir Flask

Ini adalah backend untuk aplikasi Sistem Pendukung Keputusan (SPK) Pemilihan Karir/Jurusan Siswa. Dibangun menggunakan framework **Flask (Python)** dengan pendekatan REST API.

## Teknologi Utama
- **Flask**: Framework web utama
- **Flask-SQLAlchemy**: ORM untuk berinteraksi dengan database MySQL
- **Flask-Migrate**: Manajemen migrasi database
- **Flask-JWT-Extended**: Otentikasi dan otorisasi dengan JSON Web Tokens (JWT)
- **Flask-APScheduler**: Manajemen cron jobs / penjadwalan otomatis di background
- **MySQL**: Database relational
- **Pandas, NumPy, SciPy**: Library untuk kebutuhan pemrosesan data, statistik, dan algoritma SPK (BWM & MOORA)

## Struktur Folder & File Penting
- `app.py`: File *entry-point* utama aplikasi Flask. Berisi registrasi *blueprints* (rute), inisiasi database, konfigurasi CORS, JWT, dan inisiasi scheduler.
- `models.py`: Definisi schema dan struktur tabel database (menggunakan SQLAlchemy).
- `config.py`: File konfigurasi aplikasi yang membaca dari *environment variables*.
- `command.py`: Kumpulan custom CLI commands (contoh: `flask seed_db` dan `flask migrate_fresh`).
- `routes/`: Folder berisi endpoint-endpoint API yang dipecah berdasarkan entitas atau modul (seperti `auth.py`, `siswa.py`, `bwm.py`, dll).
- `requirements.txt`: Daftar ekstensi dan library Python pihak ketiga yang dibutuhkan aplikasi.
- `migrations/`: Folder yang otomatis di-generate oleh Flask-Migrate untuk melacak riwayat perubahan skema database.
- `.env`: File *environment variables* (tidak di-commit, harus dibuat manual) untuk mengatur koneksi database dan *secret keys*.

## Instalasi & Persiapan Menjalankan Lokal

### 1. Buat Virtual Environment
Disarankan untuk membuat *virtual environment* Python agar dependensi tidak konflik dengan project lain.
```bash
python -m venv venv
```
Aktifkan virtual environment tersebut:
- **Windows**: `venv\Scripts\activate`
- **Mac/Linux**: `source venv/bin/activate`

### 2. Install Dependensi
```bash
pip install -r requirements.txt
```

### 3. Konfigurasi Database (.env)
Buat file bernama `.env` di dalam root folder `backend/` dan isi dengan konfigurasi database MySQL Anda:
```env
# Flask Settings
SECRET_KEY=ganti-dengan-rahasia-apa-saja
JWT_SECRET_KEY=ganti-dengan-rahasia-jwt-apa-saja

# Database Settings
DB_USERNAME=root
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=spk_karir_flask
```
*Catatan: Pastikan Anda sudah membuat sebuah database kosong dengan nama `spk_karir_flask` di MySQL server lokal (seperti XAMPP / Laragon / MySQL Server).*

### 4. Setup Tabel Database (Migrasi & Seed)
Untuk mempermudah membuat tabel secara otomatis beserta data awal (*dummy* atau default):

Jalankan perintah berikut untuk me-reset ulang database, membuat tabel, dan menjalankan *seeder*:
```bash
flask migrate_fresh
```
*(Perintah ini akan menghapus semua isi database yang ada, melakukan `db upgrade`, lalu mengisi data awal).*

Jika hanya ingin mengisi ulang data awal (*seed*):
```bash
flask seed_db
```

### 5. Menjalankan Aplikasi Server
Setelah berhasil, nyalakan server Flask menggunakan perintah:
```bash
python app.py
```
*(Secara bawaan server berjalan di `http://127.0.0.1:5000` dengan mode *Debug* aktif).*

---

## API Routes & Dokumentasi
Semua rute (API endpoints) memiliki prefix `/api` (misal: `http://localhost:5000/api/...`).
Rute lengkap dapat dilihat di folder `routes/`. Secara garis besar tersedia modul-modul berikut:
- **Authentication**: `/api/auth` (Login)
- **Data Master**: `/api/siswa`, `/api/periode`, `/api/jurusan`, `/api/kriteria`
- **Algoritma SPK**: `/api/bwm`, `/api/moora`, `/api/simulation`
- **Admin Management**: `/api/admin/siswa`, `/api/admin/pakar`, `/api/admin/users`, `/api/settings`
- **Dashboard & Laporan**: `/api/dashboard`, `/api/monitoring`, `/api/alumni`

## Penjadwalan Otomatis (Cron Job)
Aplikasi ini sudah mengimplementasikan Cron Job (*APScheduler*) pada fungsi `cek_periode_harian` di `app.py`. 
Scheduler ini akan mengeksekusi pemeriksaan setiap hari pada pukul `00:05` untuk melihat apakah hari ini adalah waktu pembuatan periode Ganjil/Genap otomatis beserta proses kenaikan kelas atau kelulusan siswa sesuai tanggal yang disetting.

## CORS Configuration
Akses API sudah diizinkan (CORS enabled) secara khusus untuk *frontend* lokal React yang berjalan pada port `5173` atau `5174`. Apabila frontend di-*deploy* ke domain spesifik, pastikan merubah pengaturan `origins` pada `app.py` baris 37.
