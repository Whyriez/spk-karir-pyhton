from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Kriteria, NilaiSiswa, User, Jurusan, Pertanyaan, HasilRekomendasi, Periode, RiwayatKelas
import json

siswa_bp = Blueprint('siswa', __name__)


# --- GET FORM DATA (Kriteria & Existing Values) ---
@siswa_bp.route('/form', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_form():
    current_user_id = get_jwt_identity()

    # --- CEK ELIGIBILITY (BARU) ---
    periode_aktif = Periode.query.filter_by(is_active=True).first()
    is_eligible = False
    status_message = ""

    if periode_aktif:
        riwayat = RiwayatKelas.query.filter_by(
            siswa_id=current_user_id,
            periode_id=periode_aktif.id,
            status_akhir='Aktif'
        ).first()

        if riwayat:
            is_eligible = True
        else:
            status_message = "Anda tidak terdaftar aktif di periode ini (Mungkin sudah Lulus)."
    else:
        status_message = "Sistem sedang tidak menerima penilaian (Periode Non-Aktif)."

    # Jika tidak eligible, langsung return (Hemat resource)
    if not is_eligible:
        return jsonify({
            'is_eligible': False,
            'message': status_message,
            'data': []
        })

    # Ambil kriteria yang aktif & tampil di siswa
    kriterias = Kriteria.query.filter_by(
        sumber_nilai='input_siswa',
        tampil_di_siswa=True
    ).order_by(Kriteria.kode.asc()).all()

    # Ambil nilai lama jika ada (untuk edit)
    nilai_lama = NilaiSiswa.query.filter_by(siswa_id=current_user_id).all()
    # Note: Logic ambil nilai lama mungkin perlu disesuaikan jika ingin per-pertanyaan,
    # tapi untuk sekarang kita biarkan kosong atau load logic agregat jika perlu.
    # Namun, karena frontend values sekarang berbasis ID Pertanyaan,
    # idealnya kita load history jawaban per pertanyaan (jika fitur save draft ada).
    # Untuk simpelnya, kita return form kosong/default dulu atau nilai agregat.

    # Kita siapkan data kriteria
    data = []
    for k in kriterias:
        # Parsing JSON opsi_pilihan jika berupa string (safety check)
        opsi = k.opsi_pilihan
        if isinstance(opsi, str):
            try:
                opsi = json.loads(opsi)
            except:
                opsi = []

        # Ambil daftar pertanyaan aktif
        list_pertanyaan = []
        if hasattr(k, 'list_pertanyaan'):
            for p in k.list_pertanyaan:
                if p.is_active:
                    list_pertanyaan.append({
                        'id': p.id,
                        'teks': p.teks
                    })

        data.append({
            'id': k.id,
            'kode': k.kode,
            'nama': k.nama,
            # 'pertanyaan': k.pertanyaan,  <-- HAPUS INI (Penyebab Error)
            'list_pertanyaan': list_pertanyaan,  # <-- GANTI DENGAN INI
            'tipe_input': k.tipe_input.value if hasattr(k.tipe_input, 'value') else str(k.tipe_input),
            'atribut': k.atribut.value if hasattr(k.atribut, 'value') else str(k.atribut),
            'kategori': k.kategori.value if hasattr(k.kategori, 'value') else str(k.kategori),
            'opsi_pilihan': opsi,
            'skala_maks': k.skala_maks,
            'value': None  # Placeholder
        })

    return jsonify({'is_eligible': True, 'data': data})


# --- SAVE VALUES ---
@siswa_bp.route('/save', methods=['POST'])
@jwt_required()
def save_nilai():
    user_id = get_jwt_identity()

    # 1. Validasi Periode & Status Siswa
    periode_aktif = Periode.query.filter_by(is_active=True).first()
    if not periode_aktif:
        return jsonify({'msg': 'Tidak ada periode tahun ajaran yang aktif.'}), 400

    riwayat = RiwayatKelas.query.filter_by(
        siswa_id=user_id,
        periode_id=periode_aktif.id,
        status_akhir='Aktif'
    ).first()

    if not riwayat:
        return jsonify({'msg': 'Akses ditolak. Anda tidak terdaftar aktif.'}), 403

    # 2. Proses Input Data
    data = request.get_json()
    values = data.get('values', {})
    temp_scores = {}
    snapshot_data = []

    try:
        # A. Loop Input & Simpan ke NilaiSiswa
        for key, val in values.items():
            try:
                p_id = int(key)
                pertanyaan = Pertanyaan.query.get(p_id)
                if pertanyaan:
                    k_id = pertanyaan.kriteria_id
                    if k_id not in temp_scores: temp_scores[k_id] = []

                    val_float = float(val) if val else 0
                    temp_scores[k_id].append(val_float)

                    snapshot_data.append({
                        'kriteria_kode': pertanyaan.kriteria.kode,
                        'kriteria_nama': pertanyaan.kriteria.nama,
                        'pertanyaan_teks': pertanyaan.teks,
                        'jawaban_nilai': val
                    })
            except ValueError:
                continue

        for k_id, scores in temp_scores.items():
            avg_score = sum(scores) / len(scores)
            nilai_obj = NilaiSiswa.query.filter_by(siswa_id=user_id, kriteria_id=k_id).first()
            if not nilai_obj:
                nilai_obj = NilaiSiswa(siswa_id=user_id, kriteria_id=k_id)
                db.session.add(nilai_obj)
            nilai_obj.nilai_input = avg_score

        # B. Buat Placeholder Hasil (Agar tidak error NOT NULL sebelum hitung)
        hasil = HasilRekomendasi.query.filter_by(siswa_id=user_id, periode_id=periode_aktif.id).first()
        if not hasil:
            hasil = HasilRekomendasi(
                siswa_id=user_id,
                periode_id=periode_aktif.id,
                keputusan_terbaik="Sedang Menghitung...",  # Placeholder sementara
                tingkat_kelas=riwayat.tingkat_kelas
            )
            db.session.add(hasil)

        # Simpan Snapshot Jawaban (History apa yang diisi user)
        hasil.detail_snapshot = snapshot_data
        hasil.tingkat_kelas = riwayat.tingkat_kelas

        # COMMIT 1: Simpan Input Mentah & Placeholder dulu
        db.session.commit()

        # -----------------------------------------------------------------
        # C. TRIGGER PERHITUNGAN MOORA OTOMATIS
        # -----------------------------------------------------------------
        # Import lokal untuk menghindari circular import
        from routes.moora import calculate_ranking

        # Jalankan perhitungan (ini akan update tabel HasilRekomendasi dengan skor real)
        calculated_result, error_msg = calculate_ranking(periode_aktif.id, user_id)

        if error_msg:
            print(f"Warning Hitung Otomatis: {error_msg}")
            # Kita tidak return error 500 karena data input sudah tersimpan.
            # User tetap dapat notif sukses, tapi hasil mungkin belum keluar sempurna.

        return jsonify({'msg': 'Data berhasil disimpan & dikalkulasi!'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"ERROR SAVE: {e}")
        return jsonify({'msg': f'Gagal menyimpan: {str(e)}'}), 500