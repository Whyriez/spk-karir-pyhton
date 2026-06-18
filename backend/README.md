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

- `app.py`: File _entry-point_ utama aplikasi Flask. Berisi registrasi _blueprints_ (rute), inisiasi database, konfigurasi CORS, JWT, dan inisiasi scheduler.
- `models.py`: Definisi schema dan struktur tabel database (menggunakan SQLAlchemy).
- `config.py`: File konfigurasi aplikasi yang membaca dari _environment variables_.
- `command.py`: Kumpulan custom CLI commands (contoh: `flask seed_db` dan `flask migrate_fresh`).
- `routes/`: Folder berisi endpoint-endpoint API yang dipecah berdasarkan entitas atau modul (seperti `auth.py`, `siswa.py`, `bwm.py`, dll).
- `requirements.txt`: Daftar ekstensi dan library Python pihak ketiga yang dibutuhkan aplikasi.
- `migrations/`: Folder yang otomatis di-generate oleh Flask-Migrate untuk melacak riwayat perubahan skema database.
- `.env`: File _environment variables_ (tidak di-commit, harus dibuat manual) untuk mengatur koneksi database dan _secret keys_.

## Instalasi & Persiapan Menjalankan Lokal

### 1. Buat Virtual Environment

Disarankan untuk membuat _virtual environment_ Python agar dependensi tidak konflik dengan project lain.

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

_Catatan: Pastikan Anda sudah membuat sebuah database kosong dengan nama `spk_karir_flask` di MySQL server lokal (seperti XAMPP / Laragon / MySQL Server)._

### 4. Setup Tabel Database (Migrasi & Seed)

Untuk mempermudah membuat tabel secara otomatis beserta data awal (_dummy_ atau default):

Jalankan perintah berikut untuk me-reset ulang database, membuat tabel, dan menjalankan _seeder_:

```bash
flask migrate_fresh
```

_(Perintah ini akan menghapus semua isi database yang ada, melakukan `db upgrade`, lalu mengisi data awal)._

Jika hanya ingin mengisi ulang data awal (_seed_):

```bash
flask seed_db
```

**Daftar Akun Default (Setelah Seeding):**
Berikut adalah akun dummy yang otomatis dibuat setelah menjalankan perintah `seed_db`:

| Role | Nama | Username (NIP/NISN) | Password |
|---|---|---|---|
| **Admin** | Administrator Sistem | `198001012005011001` | `123` |
| **Pakar (Guru BK)** | Ibu Guru BK | `198502022010012002` | `123` |
| **Pakar (Kaprodi TKJ)**| Bapak Kaprodi TKJ | `197803032003011003` | `123` |
| **Siswa (Kelas 12)** | Ucup Supriatna (Kls 12) | `0044432128` | `123` |
| **Siswa (Kelas 10)** | Acong Slamet (Kls 10) | `123456789` | `123` |

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

Aplikasi ini sudah mengimplementasikan Cron Job (_APScheduler_) pada fungsi `cek_periode_harian` di `app.py`.
Scheduler ini akan mengeksekusi pemeriksaan setiap hari pada pukul `00:05` untuk melihat apakah hari ini adalah waktu pembuatan periode Ganjil/Genap otomatis beserta proses kenaikan kelas atau kelulusan siswa sesuai tanggal yang disetting.

## CORS Configuration

Akses API sudah diizinkan (CORS enabled) secara khusus untuk _frontend_ lokal React yang berjalan pada port `5173` atau `5174`. Apabila frontend di-_deploy_ ke domain spesifik, pastikan merubah pengaturan `origins` pada `app.py` baris 37.
