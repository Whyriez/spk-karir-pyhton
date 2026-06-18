# Sistem Pendukung Keputusan (SPK) Pemilihan Karir/Jurusan Siswa

Aplikasi Sistem Pendukung Keputusan (SPK) untuk merekomendasikan Pemilihan Karir/Jurusan Siswa menggunakan metode kombinasi **BWM (Best Worst Method)** dan **MOORA (Multi-Objective Optimization on the basis of Ratio Analysis)**.

Proyek ini menggunakan arsitektur *Full-Stack* yang terpisah antara sisi *Client* (Frontend) dan *Server* (Backend).

---

## 📂 Struktur Repositori

Repositori ini terdiri dari dua bagian utama:

1. **`backend/`**
   Merupakan server REST API yang dibangun dengan **Flask (Python)**. Bertugas menangani operasi database (MySQL), autentikasi, serta menjalankan logika komputasi untuk algoritma BWM dan MOORA.
   👉 **[Lihat Dokumentasi Backend](./backend/README.md)**

2. **`frontend/`**
   Merupakan antarmuka pengguna (UI) / *Single Page Application* yang dibangun dengan **React 19 (Vite)** dan **Tailwind CSS v4**. Bertugas menyajikan visualisasi data, form interaktif, dan laporan untuk admin, pakar, maupun pengguna.
   👉 **[Lihat Dokumentasi Frontend](./frontend/README.md)**

---

## 🚀 Memulai Cepat (*Quick Start*)

### Opsi A: Menggunakan Docker (Rekomendasi & Praktis)

Aplikasi ini sudah siap dijalankan menggunakan **Docker**. Proses build *frontend* akan otomatis digabungkan dengan server *backend*, dan database MySQL juga akan disiapkan secara otomatis.

**Langkah-langkah:**
1. Pastikan **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (atau Docker Compose) sudah berjalan di komputer Anda.
2. Buka terminal di *root* folder proyek ini (tempat file `docker-compose.yml` berada), lalu jalankan perintah berikut untuk mem-build dan menyalakan container:
   ```bash
   docker-compose up -d --build
   ```
3. Tunggu hingga proses instalasi dan build selesai. Setelah container menyala, database masih kosong. Lakukan migrasi tabel beserta pengisian data awal (*seeding*) dengan menjalankan:
   ```bash
   docker-compose exec web flask migrate_fresh
   ```
4. 🎉 **Selesai!** Buka browser Anda dan akses:
   👉 **http://localhost:5000**

*Catatan: Untuk mematikan aplikasi, jalankan perintah `docker-compose down`.*

---

### Opsi B: Instalasi Manual (Mode Pengembangan/Development)

Jika Anda ingin mengedit kode dan menjalankan server backend/frontend secara terpisah:

#### Langkah 1: Setup Backend
1. Buka terminal baru dan masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat *virtual environment* Python, install dependencies (`requirements.txt`), atur `.env` untuk database MySQL, dan jalankan server Flask.
3. Penjelasan lebih detail: **[Baca README Backend](./backend/README.md)**.

### Langkah 2: Setup Frontend
1. Buka tab terminal baru (biarkan terminal backend tetap menyala) dan masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Install library JavaScript (`npm install`), atur koneksi API di `.env`, lalu jalankan server Vite.
3. Penjelasan lebih detail: **[Baca README Frontend](./frontend/README.md)**.

---

## 🧠 Metode SPK yang Digunakan

Aplikasi ini menggunakan pendekatan **Hybrid** untuk memberikan rekomendasi terbaik:
- **BWM (Best Worst Method)**: Metode ini digunakan pada tahap awal untuk **pembobotan kriteria**. Pakar akan menentukan kriteria terbaik (*Best*) dan terburuk (*Worst*), lalu membandingkan tingkat kepentingannya terhadap kriteria lain untuk mendapatkan bobot akhir yang konsisten.
- **MOORA (Multi-Objective Optimization on the basis of Ratio Analysis)**: Setelah bobot didapatkan, metode MOORA digunakan untuk memproses matriks nilai siswa (alternatif) terhadap masing-masing kriteria. Hasil akhirnya adalah nilai optimasi dan **perankingan** siswa pada jurusan tertentu.

## ✨ Fitur Utama Aplikasi
- **Manajemen User Terpusat**: Autentikasi JWT untuk Admin, Pakar, dsb.
- **Master Data Dinamis**: Pengelolaan Tahun Ajaran (Periode), Jurusan, Kriteria, dan Data Siswa (beserta Riwayat Kenaikan Kelas otomatis).
- **Penilaian Fleksibel**: Input nilai akademik dan psikotes untuk masing-masing siswa.
- **Komputasi Cerdas**: Simulasi perhitungan SPK dari langkah awal normalisasi hingga *ranking* akhir.
- **Dashboard & Monitoring**: Visualisasi grafik interaktif untuk melihat sebaran jurusan rekomendasi.
- **Automatisasi (Cron Job)**: Fitur kenaikan tingkat kelas atau kelulusan otomatis di akhir periode ganjil/genap (menggunakan *Flask-APScheduler*).