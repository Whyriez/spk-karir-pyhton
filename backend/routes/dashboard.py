from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, HasilRekomendasi, Periode, RoleEnum
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    # --- LOGIC ADMIN & PAKAR ---
    if user.role in [RoleEnum.admin, RoleEnum.pakar]:
        # 1. Hitung Statistik Utama
        total_siswa = User.query.filter_by(role=RoleEnum.siswa).count()

        # Hitung siswa yg sudah ada di hasil rekomendasi (distinct)
        sudah_mengisi = db.session.query(func.count(func.distinct(HasilRekomendasi.siswa_id))).scalar()

        belum_mengisi = total_siswa - sudah_mengisi

        # Hitung per Kategori Keputusan
        rek_studi = HasilRekomendasi.query.filter_by(keputusan_terbaik='Melanjutkan Studi').count()
        rek_kerja = HasilRekomendasi.query.filter_by(keputusan_terbaik='Bekerja').count()
        rek_wirausaha = HasilRekomendasi.query.filter_by(keputusan_terbaik='Berwirausaha').count()

        # 2. Data Grafik Distribusi
        chart_distribution = {
            'labels': ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha'],
            'data': [rek_studi, rek_kerja, rek_wirausaha],
            'colors': ['#4F46E5', '#10B981', '#F97316']  # Indigo, Emerald, Orange
        }

        # 3. Rekapitulasi Terbaru (5 Data Terakhir)
        recent_results = HasilRekomendasi.query.order_by(HasilRekomendasi.tanggal_hitung.desc()).limit(5).all()

        rekapitulasi = []
        for res in recent_results:
            # Cari nilai max manual karena Python
            nilai_optima = max(res.skor_studi or 0, res.skor_kerja or 0, res.skor_wirausaha or 0)

            # Ambil nama jurusan (handling relasi null)
            jurusan_nama = res.siswa.jurusan.nama_jurusan if res.siswa.jurusan else '-'

            rekapitulasi.append({
                'id': res.id,
                'nama': res.siswa.name,
                'jurusan': jurusan_nama,
                'nilai_optima': nilai_optima,
                'keputusan': res.keputusan_terbaik,
                'tanggal': res.tanggal_hitung
            })

        return jsonify({
            'role': user.role.value,
            'stats': {
                'total_siswa': total_siswa,
                'sudah_mengisi': sudah_mengisi,
                'belum_mengisi': belum_mengisi,
                'rekomendasi_studi': rek_studi,
                'rekomendasi_kerja': rek_kerja,
                'rekomendasi_wirausaha': rek_wirausaha
            },
            'chart_distribution': chart_distribution,
            'rekapitulasi': rekapitulasi
        })

    # --- LOGIC SISWA (History Grafik) ---
    elif user.role == RoleEnum.siswa:
        # Ambil history urut periode
        history_data = HasilRekomendasi.query.filter_by(siswa_id=user.id).order_by(
            HasilRekomendasi.periode_id.asc()).all()

        history_list = []
        for h in history_data:
            # Label periode (misal: "Kelas 10")
            label_periode = h.periode.nama_periode if h.periode else f'Kelas {h.tingkat_kelas}'

            history_list.append({
                'id': h.id,
                'label': label_periode,
                'kelas': h.tingkat_kelas,
                'skor_studi': h.skor_studi,
                'skor_kerja': h.skor_kerja,
                'skor_wirausaha': h.skor_wirausaha,
                'keputusan': h.keputusan_terbaik
            })

        return jsonify({
            'role': 'siswa',
            'history': history_list
        })

    return jsonify({'msg': 'Role tidak dikenali'}), 400