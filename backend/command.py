import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash

# Import Model & Enum yang relevan saja
from models import (
    db, User, Jurusan, Kriteria, Setting, Periode, HasilRekomendasi,
    Pertanyaan, RiwayatKelas, RoleEnum, TipeInputEnum,
    AtributEnum, KategoriEnum, SumberNilaiEnum
)


@click.command(name='seed_db')
@with_appcontext
def seed_db():
    """Seed the database with initial data matching updated Models."""
    print("🌱 Starting Database Seeding...")

    # Urutan sangat penting karena Foreign Keys!
    seed_jurusan()
    seed_settings()
    seed_periode()
    seed_kriteria_dan_pertanyaan()
    seed_users_dan_riwayat()
    seed_simulasi_rekomendasi()

    print("✅ Database seeding completed successfully!")


def seed_jurusan():
    print("   ↳ Seeding Jurusan...")
    jurusan_data = [
        {'kode': 'TKJ', 'nama': 'Teknik Komputer dan Jaringan'},
        {'kode': 'RPL', 'nama': 'Rekayasa Perangkat Lunak'},
        {'kode': 'MM', 'nama': 'Multimedia'},
        {'kode': 'AKL', 'nama': 'Akuntansi dan Keuangan Lembaga'},
        {'kode': 'OTKP', 'nama': 'Otomatisasi Tata Kelola Perkantoran'},
    ]

    for item in jurusan_data:
        if not Jurusan.query.filter_by(kode_jurusan=item['kode']).first():
            j = Jurusan(kode_jurusan=item['kode'], nama_jurusan=item['nama'])
            db.session.add(j)
    db.session.commit()


def seed_settings():
    print("   ↳ Seeding Settings...")
    settings = [
        {'key': 'nama_sekolah', 'value': 'SMKN 1 Gorontalo'},
        {'key': 'auto_periode', 'value': 'false'}
    ]
    for s in settings:
        if not Setting.query.filter_by(key=s['key']).first():
            db.session.add(Setting(key=s['key'], value=s['value']))
    db.session.commit()


def seed_periode():
    print("   ↳ Seeding Periode...")
    p_data = [
        {'nama': 'TA 2022/2023 (Ganjil)', 'active': False, 'promotion': False},
        {'nama': 'TA 2023/2024 (Ganjil)', 'active': False, 'promotion': True},
        {'nama': 'TA 2024/2025 (Ganjil)', 'active': True, 'promotion': True},  # Periode Aktif
    ]

    for p in p_data:
        periode = Periode.query.filter_by(nama_periode=p['nama']).first()
        if not periode:
            periode = Periode(nama_periode=p['nama'])
            db.session.add(periode)
            
        # Update nilai jika sudah ada
        periode.is_active = p['active']
        periode.is_promotion_period = p['promotion']
        
    db.session.commit()


def seed_kriteria_dan_pertanyaan():
    print("   ↳ Seeding Kriteria & Pertanyaan...")

    kriteria_list = [
        # --- KELOMPOK 1: DATA AKADEMIK ---
        {
            'kode': 'C1', 'nama': 'Nilai Akademik',
            'pertanyaan_teks': 'Masukkan nilai rata-rata rapor Anda (Skala 0-100).',
            'tipe': TipeInputEnum.number,
            'kategori': KategoriEnum.akademik,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'umum', 'target': 'all', 'skala': 100, 'reverse': None
        },
        {
            'kode': 'C4', 'nama': 'Kondisi Ekonomi',
            'pertanyaan_teks': 'Pilih rentang penghasilan orang tua per bulan.',
            'tipe': TipeInputEnum.select,
            'kategori': KategoriEnum.akademik,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'gurubk', 'target': 'all', 'skala': 5, 'reverse': 'kerja',
            # PERBAIKAN: Hilangkan json.dumps karena kolom sudah tipe JSON
            'opsi': [
                {'val': 1, 'label': 'Kurang Mampu (< 1 Juta)'},
                {'val': 2, 'label': 'Cukup (1 - 3 Juta)'},
                {'val': 3, 'label': 'Sedang (3 - 5 Juta)'},
                {'val': 4, 'label': 'Mampu (5 - 10 Juta)'},
                {'val': 5, 'label': 'Sangat Mampu (> 10 Juta)'}
            ]
        },
        {
            'kode': 'C6', 'nama': 'Ketersediaan Lapangan Kerja',
            'pertanyaan_teks': None,  # Statis, tidak ada pertanyaan ke siswa
            'tipe': TipeInputEnum.number,
            'kategori': KategoriEnum.akademik,
            'sumber': SumberNilaiEnum.static_jurusan,
            'pj': 'kaprodi', 'target': 'studi,kerja', 'skala': 5, 'reverse': None
        },

        # --- KELOMPOK 2: MINAT (GURU BK) ---
        {
            'kode': 'C2', 'nama': 'Minat Lanjut Studi',
            'pertanyaan_teks': 'Seberapa besar keinginan Anda untuk melanjutkan ke Perguruan Tinggi?',
            'tipe': TipeInputEnum.likert,
            'kategori': KategoriEnum.kuesioner,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'gurubk', 'target': 'studi', 'skala': 5, 'reverse': None
        },
        {
            'kode': 'C3', 'nama': 'Minat Lanjut Kerja',
            'pertanyaan_teks': 'Seberapa siap Anda secara skill untuk langsung bekerja?',
            'tipe': TipeInputEnum.likert,
            'kategori': KategoriEnum.kuesioner,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'gurubk', 'target': 'kerja', 'skala': 5, 'reverse': None
        },
        {
            'kode': 'C5', 'nama': 'Motivasi & Dukungan Ortu',
            'pertanyaan_teks': 'Seberapa besar dukungan orang tua terhadap pilihan karir ini?',
            'tipe': TipeInputEnum.likert,
            'kategori': KategoriEnum.kuesioner,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'gurubk', 'target': 'all', 'skala': 5, 'reverse': None
        },

        # --- KELOMPOK 3: WIRAUSAHA (KAPRODI) ---
        {
            'kode': 'C7', 'nama': 'Minat Wirausaha',
            'pertanyaan_teks': 'Seberapa besar ketertarikan Anda untuk memulai bisnis sendiri?',
            'tipe': TipeInputEnum.likert,
            'kategori': KategoriEnum.kuesioner,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'kaprodi', 'target': 'wirausaha', 'skala': 5, 'reverse': None
        },
        {
            'kode': 'C8', 'nama': 'Ketersediaan Modal/Aset',
            'pertanyaan_teks': 'Seberapa siap ketersediaan modal awal jika berwirausaha?',
            'tipe': TipeInputEnum.likert,
            'kategori': KategoriEnum.kuesioner,
            'sumber': SumberNilaiEnum.input_siswa,
            'pj': 'kaprodi', 'target': 'wirausaha', 'skala': 5, 'reverse': None
        },
    ]

    for data in kriteria_list:
        k = Kriteria.query.filter_by(kode=data['kode']).first()
        if not k:
            k = Kriteria(kode=data['kode'])
            db.session.add(k) # Add to session if new

        k.nama = data['nama']
        k.tipe_input = data['tipe']
        k.opsi_pilihan = data.get('opsi')
        k.kategori = data['kategori']
        k.sumber_nilai = data['sumber']
        k.penanggung_jawab = data['pj']
        k.target_jalur = data['target']
        k.skala_maks = data['skala']
        k.jalur_reverse = data['reverse']
        k.atribut = AtributEnum.benefit

        db.session.flush()  # Flush agar dapat ID kriteria untuk pertanyaan

        if data.get('pertanyaan_teks'):
            p = Pertanyaan.query.filter_by(kriteria_id=k.id).first()
            if not p:
                p = Pertanyaan(kriteria_id=k.id)
                db.session.add(p)

            p.teks = data['pertanyaan_teks']
            p.urutan = 1
            p.is_active = True

    db.session.commit()


def seed_users_dan_riwayat():
    print("   ↳ Seeding Users & Riwayat Kelas...")

    jurusan_tkj = Jurusan.query.filter_by(kode_jurusan='TKJ').first()
    periode_aktif = Periode.query.filter_by(is_active=True).first()

    if not periode_aktif:
        print("   ⚠️  Warning: Tidak ada periode aktif, Riwayat Kelas mungkin gagal.")

    def create_user(data, role_enum, kelas_info=None):
        u = User.query.filter_by(username=data['username']).first()
        if not u:
            u = User(
                name=data['name'],
                email=data['email'],
                username=data['username'],
                password=generate_password_hash(data['password']),
                role=role_enum,
                jenis_pakar=data.get('jenis_pakar'),
                jurusan_id=data.get('jurusan_id'),
                nisn=data.get('nisn')
            )
            db.session.add(u)
            db.session.flush()  

        if role_enum == RoleEnum.siswa and kelas_info and periode_aktif:
            riwayat = RiwayatKelas.query.filter_by(
                siswa_id=u.id,
                periode_id=periode_aktif.id
            ).first()

            if not riwayat:
                riwayat = RiwayatKelas(
                    siswa_id=u.id,
                    periode_id=periode_aktif.id,
                    tingkat_kelas=kelas_info['tingkat'],
                    jurusan_id=kelas_info['jurusan_id'],
                    status_akhir='Aktif'
                )
                db.session.add(riwayat)

    # 1. Admin
    create_user({
        'name': 'Administrator Sistem', 'email': 'admin@smk.id', 'username': 'admin', 'password': '123'
    }, RoleEnum.admin)

    # 2. Pakar Guru BK
    create_user({
        'name': 'Ibu Guru BK', 'email': 'gurubk@smk.id', 'username': 'gurubk', 'password': '123',
        'jenis_pakar': 'gurubk'
    }, RoleEnum.pakar)

    # 3. Pakar Kaprodi
    create_user({
        'name': 'Bapak Kaprodi TKJ', 'email': 'kaprodi@smk.id', 'username': 'kaprodi', 'password': '123',
        'jenis_pakar': 'kaprodi', 'jurusan_id': jurusan_tkj.id if jurusan_tkj else None
    }, RoleEnum.pakar)

    # 4. Siswa Kelas 12
    create_user({
        'name': 'Alim Suma (Kls 12)', 'email': 'alim@student.ung.ac.id', 'username': 'siswa12', 'password': '123',
        'nisn': '531422058', 'jurusan_id': jurusan_tkj.id if jurusan_tkj else None
    }, RoleEnum.siswa, kelas_info={'tingkat': '12', 'jurusan_id': jurusan_tkj.id if jurusan_tkj else None})

    # 5. Siswa Kelas 10
    create_user({
        'name': 'Budi Santoso (Kls 10)', 'email': 'budi@smk.id', 'username': 'siswa10', 'password': '123',
        'nisn': '123456789', 'jurusan_id': jurusan_tkj.id if jurusan_tkj else None
    }, RoleEnum.siswa, kelas_info={'tingkat': '10', 'jurusan_id': jurusan_tkj.id if jurusan_tkj else None})

    db.session.commit()


def seed_simulasi_rekomendasi():
    print("   ↳ Seeding Simulasi History...")

    siswa = User.query.filter_by(username='siswa12').first()
    periodes = Periode.query.order_by(Periode.id.asc()).all()

    if siswa and len(periodes) >= 3:
        if HasilRekomendasi.query.filter_by(siswa_id=siswa.id).count() == 0:
            
            db.session.add(HasilRekomendasi(
                siswa_id=siswa.id,
                periode_id=periodes[0].id,
                tingkat_kelas='10',
                skor_studi=0.4, skor_kerja=0.4, skor_wirausaha=0.3,
                keputusan_terbaik='Bekerja'
            ))

            db.session.add(HasilRekomendasi(
                siswa_id=siswa.id,
                periode_id=periodes[1].id,
                tingkat_kelas='11',
                skor_studi=0.6, skor_kerja=0.45, skor_wirausaha=0.35,
                keputusan_terbaik='Melanjutkan Studi'
            ))

            db.session.add(HasilRekomendasi(
                siswa_id=siswa.id,
                periode_id=periodes[2].id,
                tingkat_kelas='12',
                skor_studi=0.85, skor_kerja=0.5, skor_wirausaha=0.4,
                keputusan_terbaik='Melanjutkan Studi',
                catatan_guru_bk='Sangat direkomendasikan masuk Teknik Informatika.'
            ))

            db.session.commit()


@click.command(name='migrate_fresh')
@with_appcontext
def migrate_fresh():
    """Menghapus semua tabel dan membuat ulang (seperti migrate:fresh) lalu seeding."""
    print("⚠️  Warning: Dropping all tables...")
    db.drop_all()

    print("🛠️  Creating all tables from models...")
    db.create_all()

    # Panggil seed_db
    ctx = click.get_current_context()
    ctx.invoke(seed_db)