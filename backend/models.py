from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import JSON
import enum

db = SQLAlchemy()


# --- ENUMS ---
class RoleEnum(enum.Enum):
    admin = 'admin'
    pakar = 'pakar'
    siswa = 'siswa'


class KelasEnum(enum.Enum):
    kelas_10 = '10'
    kelas_11 = '11'
    kelas_12 = '12'
    alumni = 'alumni'


class TipeInputEnum(enum.Enum):
    number = 'number'
    select = 'select'
    likert = 'likert'


class AtributEnum(enum.Enum):
    benefit = 'benefit'
    cost = 'cost'


class KategoriEnum(enum.Enum):
    akademik = 'akademik'
    kuesioner = 'kuesioner'


class SumberNilaiEnum(enum.Enum):
    input_siswa = 'input_siswa'
    static_jurusan = 'static_jurusan'


class ComparisonTypeEnum(enum.Enum):
    best_to_others = 'best_to_others'
    others_to_worst = 'others_to_worst'


# --- MODELS ---

class Jurusan(db.Model):
    __tablename__ = 'jurusan'

    id = db.Column(db.Integer, primary_key=True)
    kode_jurusan = db.Column(db.String(255), unique=True, nullable=False)
    nama_jurusan = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Relasi balik untuk akses mudah (Optional)
    # users = db.relationship('User', backref='jurusan', lazy=True)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    password = db.Column(db.String(255), nullable=False)

    # Enum types
    role = db.Column(db.Enum(RoleEnum), default=RoleEnum.siswa, nullable=False)

    # --- MISSING FIELDS ADDED ---
    jenis_pakar = db.Column(db.String(255), nullable=True)  # Untuk role pakar
    jurusan_id = db.Column(db.Integer, db.ForeignKey('jurusan.id', ondelete='SET NULL'), nullable=True)
    # ----------------------------

    nisn = db.Column(db.String(255), unique=True, nullable=True)
    remember_token = db.Column(db.String(100), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Setup relasi ke Jurusan
    jurusan = db.relationship('Jurusan', backref='users')


class RiwayatKelas(db.Model):
    __tablename__ = 'riwayat_kelas'

    id = db.Column(db.Integer, primary_key=True)

    # Kunci Utama: Siapa, Kapan, Dimana
    siswa_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    periode_id = db.Column(db.Integer, db.ForeignKey('periodes.id', ondelete='CASCADE'), nullable=False)

    # Data Snapshot (Penting disimpan lagi disini agar historisnya statis)
    tingkat_kelas = db.Column(db.String(20), nullable=False)  # '10', '11', '12'
    jurusan_id = db.Column(db.Integer, db.ForeignKey('jurusan.id'), nullable=True)

    # Status Akhir di Periode Ini (Untuk Kenaikan Kelas nanti)
    # Values: 'Aktif', 'Naik Kelas', 'Tinggal Kelas', 'Lulus', 'Keluar'
    status_akhir = db.Column(db.String(50), default='Aktif', nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Relasi
    siswa = db.relationship('User', backref='riwayat_pendidikan')
    periode = db.relationship('Periode', backref='data_kelas')
    jurusan = db.relationship('Jurusan')

class Kriteria(db.Model):
    __tablename__ = 'kriteria'

    id = db.Column(db.Integer, primary_key=True)
    kode = db.Column(db.String(255), unique=True, nullable=False)
    nama = db.Column(db.String(255), nullable=False)
    # pertanyaan = db.Column(db.Text, nullable=True)

    # Definisi UI
    tipe_input = db.Column(db.Enum(TipeInputEnum), default=TipeInputEnum.likert, nullable=False)
    opsi_pilihan = db.Column(JSON, nullable=True)

    atribut = db.Column(db.Enum(AtributEnum), default=AtributEnum.benefit, nullable=False)
    kategori = db.Column(db.Enum(KategoriEnum), default=KategoriEnum.kuesioner, nullable=False)
    sumber_nilai = db.Column(db.Enum(SumberNilaiEnum), default=SumberNilaiEnum.input_siswa, nullable=False)

    # --- MISSING FIELDS ADDED ---
    tampil_di_siswa = db.Column(db.Boolean, default=True, nullable=False)
    penanggung_jawab = db.Column(db.String(50), default='gurubk', nullable=True)
    # ----------------------------

    # 1. Target Relevansi: Menentukan kriteria ini masuk ke perhitungan mana
    # Isi: "studi,kerja,wirausaha" atau "all"
    target_jalur = db.Column(db.String(255), default='all', nullable=True)

    # 2. Skala Maksimal: Untuk normalisasi/inversi nilai (misal C1=100, C4=5)
    skala_maks = db.Column(db.Float, default=5, nullable=False)

    # 3. Target Inversi: Untuk logika "Kebalikan" (misal: Ekonomi rendah = Bagus buat Kerja)
    # Isi: "kerja" (artinya nilainya dibalik khusus untuk jalur kerja)
    jalur_reverse = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


class Pertanyaan(db.Model):
    __tablename__ = 'pertanyaans'

    id = db.Column(db.Integer, primary_key=True)
    kriteria_id = db.Column(db.Integer, db.ForeignKey('kriteria.id', ondelete='CASCADE'), nullable=False)

    teks = db.Column(db.Text, nullable=False)
    urutan = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Relasi balik
    kriteria = db.relationship('Kriteria', backref=db.backref('list_pertanyaan', cascade="all, delete-orphan"))


class BwmComparison(db.Model):
    __tablename__ = 'bwm_comparisons'

    id = db.Column(db.Integer, primary_key=True)
    pakar_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Self-referencing Foreign Keys ke Kriteria
    best_criterion_id = db.Column(db.Integer, db.ForeignKey('kriteria.id'), nullable=False)
    worst_criterion_id = db.Column(db.Integer, db.ForeignKey('kriteria.id'), nullable=False)
    comparison_type = db.Column(db.Enum(ComparisonTypeEnum), nullable=False)
    compared_criterion_id = db.Column(db.Integer, db.ForeignKey('kriteria.id', ondelete='CASCADE'), nullable=False)

    value = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


class NilaiSiswa(db.Model):
    __tablename__ = 'nilai_siswa'

    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    kriteria_id = db.Column(db.Integer, db.ForeignKey('kriteria.id', ondelete='CASCADE'), nullable=False)

    nilai_input = db.Column(db.Float, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

class NilaiStaticJurusan(db.Model):
    __tablename__ = 'nilai_static_jurusans'
    id = db.Column(db.Integer, primary_key=True)
    jurusan_id = db.Column(db.Integer, db.ForeignKey('jurusan.id', ondelete='CASCADE'), nullable=False)
    kriteria_id = db.Column(db.Integer, db.ForeignKey('kriteria.id', ondelete='CASCADE'), nullable=False)
    nilai = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

class HasilRekomendasi(db.Model):
    __tablename__ = 'hasil_rekomendasi'

    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # --- TAMBAHAN KOLOM UNTUK HISTORY/TRACKING ---
    periode_id = db.Column(db.Integer, db.ForeignKey('periodes.id'), nullable=True)
    tingkat_kelas = db.Column(db.String(20), nullable=True)
    catatan_guru_bk = db.Column(db.Text, nullable=True)
    # ---------------------------------------------

    skor_studi = db.Column(db.Float, nullable=True)
    skor_kerja = db.Column(db.Float, nullable=True)
    skor_wirausaha = db.Column(db.Float, nullable=True)

    keputusan_terbaik = db.Column(db.String(255), nullable=False)

    detail_snapshot = db.Column(JSON, nullable=True)

    tanggal_hitung = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Relasi (Optional)
    periode = db.relationship('Periode', backref='hasil_rekomendasi')
    siswa = db.relationship('User', backref='riwayat_rekomendasi')


class Periode(db.Model):
    __tablename__ = 'periodes'

    id = db.Column(db.Integer, primary_key=True)
    nama_periode = db.Column(db.String(255), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


class BobotKriteria(db.Model):
    __tablename__ = 'bobot_kriterias'

    id = db.Column(db.Integer, primary_key=True)
    kriteria_id = db.Column(db.Integer, db.ForeignKey('kriteria.id', ondelete='CASCADE'), nullable=False)
    jurusan_id = db.Column(db.Integer, db.ForeignKey('jurusan.id', ondelete='CASCADE'), nullable=True)

    nilai_bobot = db.Column(db.Float, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


class Alumni(db.Model):
    __tablename__ = 'alumnis'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(255), nullable=False)
    batch = db.Column(db.Integer, nullable=False)
    major = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


class Setting(db.Model):  # Tambahan tabel Setting sesuai file migrasi
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(255), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)  # Bisa text atau json
    type = db.Column(db.String(50), default='text')

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())