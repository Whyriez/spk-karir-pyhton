from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
# PENTING: Tambahkan import RiwayatKelas
from models import db, User, Kriteria, NilaiSiswa, NilaiStaticJurusan, BobotKriteria, HasilRekomendasi, Periode, Alumni, \
    RiwayatKelas
from sqlalchemy import desc
import math
import numpy as np

moora_bp = Blueprint('moora', __name__)


# --- FUNGSI HELPER ---

def ensure_static_values(user_id):
    """Memastikan nilai ketersediaan lapangan kerja (C6) masuk ke NilaiSiswa"""
    user = User.query.get(user_id)
    if not user or not user.jurusan_id:
        return
    kriteria_statis = Kriteria.query.filter_by(sumber_nilai='static_jurusan').all()
    for k in kriteria_statis:
        existing = NilaiSiswa.query.filter_by(siswa_id=user_id, kriteria_id=k.id).first()
        if not existing:
            static_val = NilaiStaticJurusan.query.filter_by(jurusan_id=user.jurusan_id, kriteria_id=k.id).first()
            val_to_insert = static_val.nilai if static_val else 3  # Default 3 (Cukup)
            db.session.add(NilaiSiswa(siswa_id=user_id, kriteria_id=k.id, nilai_input=val_to_insert))
    db.session.commit()

def get_jurusan_weights(jurusan_id):
    """
    Mengambil bobot BWM optimal KHUSUS untuk jurusan siswa.
    Mengembalikan dict bobot ATAU None jika bobot belum dihitung admin.
    """
    kriterias = Kriteria.query.all()
    weights = {}
    
    # Cek apakah bobot untuk jurusan ini sudah ada di database
    bobot_tersimpan = BobotKriteria.query.filter_by(jurusan_id=jurusan_id).count()
    
    # Jika bobot kurang dari jumlah kriteria (berarti belum dihitung/belum lengkap), tolak!
    if bobot_tersimpan < len(kriterias):
        return None 

    for k in kriterias:
        stored = BobotKriteria.query.filter_by(kriteria_id=k.id, jurusan_id=jurusan_id).first()
        if stored:
            weights[k.kode] = stored.nilai_bobot
            
    return weights

def get_aggregated_weights():
    """Mengambil bobot BWM optimal dari tabel BobotKriteria"""
    kriterias = Kriteria.query.all()
    weights = {}
    for k in kriterias:
        stored = BobotKriteria.query.filter_by(kriteria_id=k.id).all()
        if stored:
            # Rata-rata bobot jika ada lebih dari 1 pakar
            weights[k.kode] = sum(s.nilai_bobot for s in stored) / len(stored)
        else:
            weights[k.kode] = 1.0 / len(kriterias)
    return weights


def calculate_ranking(periode_id, user_id):
    ensure_static_values(user_id)
    
    user = User.query.get(user_id)
    if not user or not user.jurusan_id:
        return None, "Siswa tidak memiliki jurusan yang valid."

    # 1. Ambil Bobot Khusus Jurusan Ini (Cek Gembok Validasi)
    bobot_map = get_jurusan_weights(user.jurusan_id)
    
    if bobot_map is None:
        return None, "Mohon maaf, hasil belum bisa ditampilkan karena Admin/Pakar belum menyelesaikan perhitungan bobot prioritas untuk jurusan Anda."

    # 2. Ambil Kriteria & Config dari DB
    all_kriteria = Kriteria.query.order_by(Kriteria.kode).all()
    num_kriteria = len(all_kriteria)

    # Ambil Nilai Siswa
    nilai_records = NilaiSiswa.query.filter_by(siswa_id=user_id).all()
    raw_data = {}
    for n in nilai_records:
        k_obj = Kriteria.query.get(n.kriteria_id)
        if k_obj:
            raw_data[k_obj.kode] = n.nilai_input

    # 3. Bentuk Matriks Keputusan (3 Alternatif x N Kriteria)
    alternatif_names = ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha']
    matrix = np.zeros((3, num_kriteria))

    for j, k in enumerate(all_kriteria):
        val = raw_data.get(k.kode, 1)  # Nilai default 1

        targets = (k.target_jalur or '').lower()
        reverses = (k.jalur_reverse or '').lower()
        max_scale = k.skala_maks

        def get_val_for_jalur(jalur_name):
            if 'all' in targets or jalur_name in targets:
                if jalur_name in reverses:
                    return (max_scale + 1) - val
                return val
            return 1

        matrix[0, j] = get_val_for_jalur('studi')
        matrix[1, j] = get_val_for_jalur('kerja')
        matrix[2, j] = get_val_for_jalur('wirausaha')

    # 4. Normalisasi Vektor
    norm_matrix = np.zeros((3, num_kriteria))
    for j in range(num_kriteria):
        denom = math.sqrt(sum(matrix[i, j] ** 2 for i in range(3)))
        for i in range(3):
            norm_matrix[i, j] = matrix[i, j] / denom if denom > 0 else 0

    # 5. Optimasi Yi (Benefit - Cost)
    y_scores = []
    for i in range(3):
        yi = 0
        for j in range(num_kriteria):
            code = all_kriteria[j].kode
            weight = bobot_map.get(code, 0) # Menggunakan bobot_map yang sudah difilter per jurusan

            if all_kriteria[j].atribut.value == 'benefit':
                yi += norm_matrix[i, j] * weight
            else:
                yi -= norm_matrix[i, j] * weight
        y_scores.append(yi)

    # 6. Simpan Hasil
    hasil = HasilRekomendasi.query.filter_by(siswa_id=user_id, periode_id=periode_id).first()
    if not hasil:
        hasil = HasilRekomendasi(siswa_id=user_id, periode_id=periode_id)
        db.session.add(hasil)

    hasil.skor_studi = float(y_scores[0])
    hasil.skor_kerja = float(y_scores[1])
    hasil.skor_wirausaha = float(y_scores[2])

    hasil.keputusan_terbaik = alternatif_names[np.argmax(y_scores)]

    riwayat = RiwayatKelas.query.filter_by(siswa_id=user_id, periode_id=periode_id).first()

    if riwayat:
        hasil.tingkat_kelas = riwayat.tingkat_kelas
    else:
        hasil.tingkat_kelas = "Unknown"

    db.session.commit()
    return hasil, None


# --- ROUTE HANDLER UNTUK FRONTEND ---

@moora_bp.route('/result', methods=['GET'])
@jwt_required()
def get_result():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id) # Pindahkan query user ke atas sini
    
    history_id = request.args.get('id')
    hasil = None
    periode_nama = "-"

    if history_id:
        hasil = HasilRekomendasi.query.filter_by(id=history_id, siswa_id=current_user_id).first()
        if not hasil: return jsonify({'msg': 'Riwayat tidak ditemukan'}), 404
        periode_nama = hasil.periode.nama_periode if hasil.periode else f"Kelas {hasil.tingkat_kelas}"

    else:
        periode_aktif = Periode.query.filter_by(is_active=True).first()
        is_active_student = False

        if periode_aktif:
            riwayat = RiwayatKelas.query.filter_by(
                siswa_id=current_user_id, periode_id=periode_aktif.id, status_akhir='Aktif'
            ).first()
            if riwayat:
                is_active_student = True

        if is_active_student:
            # --- CEK KETERSEDIAAN BOBOT TERLEBIH DAHULU ---
            if user and user.jurusan_id:
                kriteria_count = Kriteria.query.count()
                bobot_count = BobotKriteria.query.filter_by(jurusan_id=user.jurusan_id).count()
                if bobot_count < kriteria_count:
                    # Jika bobot belum ada, jangan suruh siswa isi form, tapi beritahu yang sebenarnya
                    return jsonify({'msg': 'Hasil rekomendasi belum tersedia karena Admin/Kaprodi jurusan Anda belum memfinalisasi perhitungan bobot.'}), 404

            # --- JIKA BOBOT AMAN, BARU CEK APAKAH SISWA SUDAH ISI PENILAIAN ---
            has_input = db.session.query(NilaiSiswa).join(Kriteria).filter(
                NilaiSiswa.siswa_id == current_user_id,
                Kriteria.sumber_nilai == 'input_siswa'
            ).first()

            if not has_input:
                return jsonify({'msg': 'Belum ada data penilaian. Silakan isi kuesioner terlebih dahulu.'}), 404

            # Hitung baru/Update
            periode_nama = periode_aktif.nama_periode
            hasil, error = calculate_ranking(periode_aktif.id, current_user_id)
            if error: return jsonify({'hasil': None, 'msg': error}), 200

        else:
            # Alumni / Tidak Aktif ... (Sisa kode biarkan sama)
            hasil = HasilRekomendasi.query.filter_by(siswa_id=current_user_id).order_by(desc(HasilRekomendasi.id)).first()
            if hasil:
                periode_nama = hasil.periode.nama_periode if hasil.periode else "-"
            else:
                return jsonify({'msg': 'Belum ada data hasil penilaian.'}), 404

    # Cari Alumni Relevan
    alumni_list = []
    user = User.query.get(current_user_id)
    if user and user.jurusan and hasil:
        keputusan = (hasil.keputusan_terbaik or '').lower()
        if 'studi' in keputusan or 'kuliah' in keputusan:
            status_keyword = 'kuliah'
        elif 'kerja' in keputusan:
            status_keyword = 'kerja'
        elif 'wirausaha' in keputusan or 'usaha' in keputusan:
            status_keyword = 'wirausaha'
        else:
            status_keyword = None

        # Normalisasi jurusan (ambil kata kunci utama)
        jurusan_keyword = user.jurusan.nama_jurusan.lower()

        query = Alumni.query

        if jurusan_keyword:
            query = query.filter(
                Alumni.major.ilike(f"%{jurusan_keyword}%")
            )

        if status_keyword:
            query = query.filter(
                Alumni.status.ilike(f"%{status_keyword}%")
            )

        alumnis = query.order_by(Alumni.batch.desc()).limit(5).all()
        alumni_list = [
            {
                'name': a.name,
                'batch': a.batch,
                'status': a.status
            }
            for a in alumnis
        ]

    return jsonify({
        'hasil': {
            'keputusan': hasil.keputusan_terbaik,
            'skor': {'studi': hasil.skor_studi, 'kerja': hasil.skor_kerja, 'wirausaha': hasil.skor_wirausaha},
            'catatan': hasil.catatan_guru_bk,
            'created_at': hasil.created_at,
            'tingkat_kelas': hasil.tingkat_kelas,
            'riwayat_jawaban': hasil.detail_snapshot or []
        },
        'alumni': alumni_list,
        'periode': periode_nama
    })