# Frontend - SPK Karir

Ini adalah bagian antarmuka pengguna (frontend) untuk aplikasi **Sistem Pendukung Keputusan (SPK) Pemilihan Karir/Jurusan Siswa**. Dibangun menggunakan ekosistem modern berbasis **React** dan dikompilasi menggunakan **Vite** agar proses pengembangan lebih cepat.

## Teknologi & Ekosistem Utama

Proyek ini mengandalkan beberapa library modern untuk mendukung performa dan produktivitas:

- **React 19**: Library UI _declarative_ berbasis komponen.
- **TypeScript**: Menambahkan _static typing_ untuk struktur kode yang lebih rapi dan bebas _bug_.
- **Vite (Rolldown)**: _Build tool_ dan _dev server_ ultra-cepat.
- **Tailwind CSS v4**: _Utility-first framework_ untuk mendesain antarmuka secara responsif dan modern dengan ringkas.
- **React Router DOM v7**: Pengelolaan navigasi (_Single Page Application_) secara _client-side_.
- **Axios**: HTTP Client untuk mengirim permintaan (request) data ke Backend API.
- **Chart.js & React-Chartjs-2**: Menampilkan visualisasi grafik data statistik dan hasil perhitungan SPK.
- **Headless UI**: Untuk membuat komponen kompleks (seperti _dropdown_, _modal_, dll) yang mudah dikustomisasi menggunakan Tailwind.
- **SweetAlert2**: Digunakan untuk menampilkan pesan pop-up interaktif (notifikasi sukses, error, peringatan, dll).
- **NProgress**: Efek _loading bar_ tipis di ujung atas layar saat memuat halaman baru atau mengirim data.

## Instalasi & Persiapan Lokal

### 1. Prasyarat

Pastikan sistem operasi Anda sudah terpasang:

- **Node.js** (Direkomendasikan versi 18 LTS ke atas)
- **npm** (Atau yarn/pnpm)

### 2. Install Dependensi (_Library_)

Buka terminal, pastikan berada di dalam folder `frontend`, lalu jalankan:

```bash
npm install
```

### 3. Konfigurasi Environment (Lingkungan)

Terdapat file konfigurasi `.env` dan `.env.production`.
Pastikan file `.env` sudah ada dan diatur untuk menunjuk ke Backend lokal. Secara umum, variabel yang krusial adalah lokasi API.
Contoh isi `.env`:

```env
VITE_API_URL=http://127.0.0.1:5000/api
```

_(Pastikan server backend Flask juga sudah berjalan)._

---

## Menjalankan Aplikasi

### Mode Pengembangan (_Development_)

Untuk menjalankan server pengembangan, gunakan perintah:

```bash
npm run dev
```

Secara _default_, aplikasi akan berjalan pada alamat `http://localhost:5173`. Fitur _Fast Refresh / HMR_ aktif, sehingga setiap perubahan pada file akan langsung tampil di _browser_.

### Mode Produksi (_Build Production_)

Jika kode sudah stabil dan ingin dikompilasi (dibungkus) menjadi file siap _deploy_, jalankan:

```bash
npm run build
```

Perintah ini akan memeriksa ketat kode TypeScript (`tsc -b`) dan mem-build (_minify_) file HTML, CSS, serta JavaScript ke dalam folder `dist/`.

> **Integrasi dengan Backend:**
> Jika Anda ingin backend (Flask) yang bertugas me-render _frontend_ ini, Anda bisa menyalin semua isi dari folder `dist/` ke folder `static/react/` yang berada di direktori `backend`.

## Struktur Kode (_Source_) Utama

Semua pengerjaan utama (_coding_) dilakukan di dalam folder `src/`.

- `src/components/`: Berisi potongan-potongan UI yang dapat digunakan kembali (_reusable_), seperti _Button_, _Sidebar_, _Card_, dll.
- `src/pages/` atau `src/views/`: Berisi struktur halaman per rute (misal halaman Login, Dashboard, Data Siswa, dsb).
- `src/utils/` atau `src/services/`: File untuk fungsi _helper_ dan integrasi API (menggunakan _axios_).
- `src/assets/`: Berisi gambar, icon, atau _font_ statis.
