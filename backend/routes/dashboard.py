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
        
        # 1. Cek apakah user adalah kaprodi
        is_kaprodi = (user.role == RoleEnum.pakar and user.jenis_pakar == 'kaprodi')

        # 2. Setup Base Query
        # Base query untuk Siswa
        siswa_query = User.query.filter_by(role=RoleEnum.siswa)
        
        # Base query untuk Hasil Rekomendasi (Join dengan User untuk filter jurusan siswa)
        hasil_query = HasilRekomendasi.query.join(User, HasilRekomendasi.siswa_id == User.id)

        # 3. Terapkan Filter Jika Kaprodi
        if is_kaprodi and user.jurusan_id:
            siswa_query = siswa_query.filter(User.jurusan_id == user.jurusan_id)
            hasil_query = hasil_query.filter(User.jurusan_id == user.jurusan_id)

        # 4. Hitung Statistik Utama menggunakan Base Query yang sudah difilter
        total_siswa = siswa_query.count()

        # Menghitung jumlah siswa unik yang sudah mengisi (terapkan join & filter)
        sudah_mengisi_query = db.session.query(func.count(func.distinct(HasilRekomendasi.siswa_id)))\
            .select_from(HasilRekomendasi)\
            .join(User, HasilRekomendasi.siswa_id == User.id)
            
        if is_kaprodi and user.jurusan_id:
            sudah_mengisi_query = sudah_mengisi_query.filter(User.jurusan_id == user.jurusan_id)

        sudah_mengisi = sudah_mengisi_query.scalar() or 0
        belum_mengisi = total_siswa - sudah_mengisi

        rek_studi = hasil_query.filter(HasilRekomendasi.keputusan_terbaik == 'Melanjutkan Studi').count()
        rek_kerja = hasil_query.filter(HasilRekomendasi.keputusan_terbaik == 'Bekerja').count()
        rek_wirausaha = hasil_query.filter(HasilRekomendasi.keputusan_terbaik == 'Berwirausaha').count()

        # 5. Data Grafik Distribusi
        chart_distribution = {
            'labels': ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha'],
            'data': [rek_studi, rek_kerja, rek_wirausaha],
            'colors': ['#4F46E5', '#10B981', '#F97316']
        }

        # 6. Rekapitulasi Terbaru (5 Data Terakhir) - Menggunakan hasil_query
        recent_results = hasil_query.order_by(HasilRekomendasi.created_at.desc()).limit(5).all()
        rekapitulasi = []
        for res in recent_results:
            nilai_optima = max(res.skor_studi or 0, res.skor_kerja or 0, res.skor_wirausaha or 0)
            jurusan_nama = res.siswa.jurusan.nama_jurusan if res.siswa.jurusan else '-'
            rekapitulasi.append({
                'id': res.id,
                'nama': res.siswa.name,
                'jurusan': jurusan_nama,
                'nilai_optima': nilai_optima,
                'keputusan': res.keputusan_terbaik,
                'tanggal': res.created_at
            })

        # ==========================================
        # 7. DATA TREN PER PERIODE (TAHUN)
        # ==========================================
        periodes = Periode.query.order_by(Periode.id.asc()).all()
        trend_labels = []
        trend_studi = []
        trend_kerja = []
        trend_wirausaha = []

        for p in periodes:
            trend_labels.append(p.nama_periode)
            
            # Hitung jumlah siswa per keputusan di periode tersebut menggunakan hasil_query
            c_studi = hasil_query.filter(HasilRekomendasi.periode_id == p.id, HasilRekomendasi.keputusan_terbaik.like('%Studi%')).count()
            c_kerja = hasil_query.filter(HasilRekomendasi.periode_id == p.id, HasilRekomendasi.keputusan_terbaik.like('%Bekerja%')).count()
            c_wirausaha = hasil_query.filter(HasilRekomendasi.periode_id == p.id, HasilRekomendasi.keputusan_terbaik.like('%Wirausaha%')).count()
            
            trend_studi.append(c_studi)
            trend_kerja.append(c_kerja)
            trend_wirausaha.append(c_wirausaha)

        trend_data = {
            'labels': trend_labels,
            'studi': trend_studi,
            'kerja': trend_kerja,
            'wirausaha': trend_wirausaha
        }

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
            'rekapitulasi': rekapitulasi,
            'trend_data': trend_data
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