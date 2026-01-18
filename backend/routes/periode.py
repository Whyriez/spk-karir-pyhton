from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Periode, RiwayatKelas, User, RoleEnum
from sqlalchemy import desc

periode_bp = Blueprint('periode', __name__)

@periode_bp.route('', methods=['GET'], strict_slashes=False)
@periode_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def index():
    periodes = Periode.query.order_by(Periode.id.desc()).all()
    data = []
    for p in periodes:
        count = RiwayatKelas.query.filter_by(periode_id=p.id).count()
        data.append({
            'id': p.id,
            'nama_periode': p.nama_periode,
            'is_active': p.is_active,
            'is_promotion_period': p.is_promotion_period, # Pastikan ini dikirim ke frontend
            'jumlah_siswa': count
        })

    return jsonify({'periodes': data, 'auto_setting': False})

@periode_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def store():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    if not data.get('nama_periode'): return jsonify({'msg': 'Nama wajib diisi'}), 400

    new_p = Periode(
        nama_periode=data['nama_periode'], 
        is_active=False,
        is_promotion_period=data.get('is_promotion_period', False)
    )
    db.session.add(new_p)
    db.session.commit()
    return jsonify({'msg': 'Periode berhasil dibuat'}), 201

@periode_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    p = Periode.query.get(id)
    if not p: return jsonify({'msg': 'Periode tidak ditemukan'}), 404

    data = request.get_json()
    
    # [FIX BUG 2] Update field is_promotion_period agar status kenaikan kelas tersimpan
    p.nama_periode = data.get('nama_periode', p.nama_periode)
    if 'is_promotion_period' in data:
        p.is_promotion_period = data['is_promotion_period']
        
    db.session.commit()
    return jsonify({'msg': 'Periode diperbarui'}), 200

@periode_bp.route('/<int:id>/activate', methods=['POST'], strict_slashes=False)
@jwt_required()
def activate(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    target_periode = Periode.query.get(id)
    if not target_periode: return jsonify({'msg': 'Periode tidak ditemukan'}), 404

    if target_periode.is_active:
        return jsonify({'msg': 'Periode ini sudah aktif.'}), 200

    try:
        # 1. Matikan SEMUA Periode Aktif Sebelumnya (Pencegahan Double Active)
        # [FIX BUG 1] Logika ini dipindah ke luar agar selalu dijalankan
        old_periode = Periode.query.filter_by(is_active=True).first()
        if old_periode:
            old_periode.is_active = False
            # Jangan commit dulu, kita butuh ID-nya untuk migrasi di bawah
        
        migrated_count = 0
        lulus_count = 0
        stay_count = 0
        msg = ""

        # 2. Logika Migrasi Data (Hanya jika ada periode lama & target lebih baru)
        if old_periode and target_periode.id > old_periode.id:
            riwayat_lama = RiwayatKelas.query.filter_by(periode_id=old_periode.id).all()
            
            # Debugging print (bisa dilihat di terminal flask)
            print(f"Migrasi dari ID {old_periode.id} ke {target_periode.id}. Mode Kenaikan: {target_periode.is_promotion_period}")

            for riwayat in riwayat_lama:
                kelas_sekarang = riwayat.tingkat_kelas
                status_sebelumnya = riwayat.status_akhir 

                next_kelas = None
                is_lulus = False

                # --- SKENARIO A: PERIODE KENAIKAN KELAS (Ganti Tahun Ajaran) ---
                if target_periode.is_promotion_period:
                    # Cek Siswa Tinggal Kelas
                    if status_sebelumnya == 'Tinggal Kelas':
                        next_kelas = kelas_sekarang # Tetap di kelas sama
                        stay_count += 1
                    
                    # Cek Siswa Naik Kelas
                    else:
                        # Update status di riwayat lama agar jelas
                        if riwayat.status_akhir == 'Aktif': 
                            riwayat.status_akhir = 'Naik Kelas'

                        # Logika Increment Kelas
                        if kelas_sekarang == '10': next_kelas = '11'
                        elif kelas_sekarang == '11': next_kelas = '12'
                        elif kelas_sekarang == '12': is_lulus = True
                
                # --- SKENARIO B: PERIODE BIASA (Ganti Semester) ---
                else:
                    # Semua siswa lanjut ke semester depan dengan KELAS SAMA
                    next_kelas = kelas_sekarang
                    is_lulus = False

                # --- EKSEKUSI PENYIMPANAN ---
                if is_lulus:
                    riwayat.status_akhir = 'Lulus'
                    lulus_count += 1
                
                elif next_kelas:
                    # Cek duplikat agar tidak insert double
                    existing = RiwayatKelas.query.filter_by(
                        siswa_id=riwayat.siswa_id,
                        periode_id=target_periode.id
                    ).first()

                    if not existing:
                        new_riwayat = RiwayatKelas(
                            siswa_id=riwayat.siswa_id,
                            periode_id=target_periode.id,
                            tingkat_kelas=next_kelas,
                            jurusan_id=riwayat.jurusan_id,
                            status_akhir='Aktif' # Reset jadi Aktif
                        )
                        db.session.add(new_riwayat)
                        migrated_count += 1

            jenis = "Kenaikan Kelas" if target_periode.is_promotion_period else "Pergantian Semester"
            msg = f"Periode {target_periode.nama_periode} ({jenis}) aktif. {migrated_count} siswa lanjut, {stay_count} tinggal, {lulus_count} lulus."

        else:
            # Jika tidak ada migrasi (misal periode pertama atau mundur)
            msg = f"Periode {target_periode.nama_periode} diaktifkan tanpa migrasi otomatis."

        # 3. Finalisasi
        target_periode.is_active = True
        db.session.commit()

        return jsonify({'msg': msg}), 200

    except Exception as e:
        db.session.rollback()
        print("Error Activate:", e) # Print error ke terminal
        return jsonify({'msg': 'Gagal mengaktifkan periode: ' + str(e)}), 500

@periode_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def delete(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    p = Periode.query.get(id)
    if not p: return jsonify({'msg': 'Periode tidak ditemukan'}), 404
    if p.is_active: return jsonify({'msg': 'Tidak bisa menghapus periode yang sedang aktif'}), 400

    try:
        RiwayatKelas.query.filter_by(periode_id=id).delete()
        db.session.delete(p)
        db.session.commit()
        return jsonify({'msg': 'Periode dihapus'}), 200
    except Exception as e:
        return jsonify({'msg': str(e)}), 500