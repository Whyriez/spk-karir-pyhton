from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Periode, RiwayatKelas, User, RoleEnum
from sqlalchemy import desc

periode_bp = Blueprint('periode', __name__)


@periode_bp.route('', methods=['GET'], strict_slashes=False)
@periode_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def index():
    # Ambil semua periode
    periodes = Periode.query.order_by(Periode.id.desc()).all()

    # Hitung jumlah siswa per periode (dari RiwayatKelas)
    data = []
    for p in periodes:
        count = RiwayatKelas.query.filter_by(periode_id=p.id).count()
        data.append({
            'id': p.id,
            'nama_periode': p.nama_periode,
            'is_active': p.is_active,
            'jumlah_siswa': count
        })

    # Cek setting auto (jika ada tabel setting) - optional
    # auto_setting = ...

    return jsonify({'periodes': data, 'auto_setting': False})


@periode_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def store():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    if not data.get('nama_periode'): return jsonify({'msg': 'Nama wajib diisi'}), 400

    new_p = Periode(nama_periode=data['nama_periode'], is_active=False)
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
    p.nama_periode = data.get('nama_periode', p.nama_periode)
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
        # 1. Cari Periode Lama (Sumber Data)
        old_periode = Periode.query.filter_by(is_active=True).first()

        migrated_count = 0
        lulus_count = 0
        msg = ""

        if old_periode:
            # Matikan periode lama
            old_periode.is_active = False

            # --- CEK ARAH WAKTU (PENTING) ---
            # Kita hanya jalankan migrasi jika bergerak MAJU (ID Target > ID Lama)
            if target_periode.id > old_periode.id:

                # --- LOGIKA PROMOSI KELAS (Hanya berjalan saat Maju) ---
                riwayat_lama = RiwayatKelas.query.filter_by(periode_id=old_periode.id).all()

                for riwayat in riwayat_lama:
                    kelas_sekarang = riwayat.tingkat_kelas
                    next_kelas = None

                    if kelas_sekarang == '10':
                        next_kelas = '11'
                    elif kelas_sekarang == '11':
                        next_kelas = '12'
                    elif kelas_sekarang == '12':
                        riwayat.status_akhir = 'Lulus'
                        lulus_count += 1
                        next_kelas = None

                    if next_kelas:
                        # Cek duplikat
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
                                status_akhir='Aktif'
                            )
                            db.session.add(new_riwayat)
                            migrated_count += 1

                msg = f"Periode {target_periode.nama_periode} diaktifkan. {migrated_count} siswa naik kelas."

            else:
                # Jika MUNDUR (Target ID < Old ID), jangan jalankan migrasi
                msg = f"Periode {target_periode.nama_periode} diaktifkan KEMBALI (Mode Mundur/Review). Tidak ada proses kenaikan kelas yang dijalankan."

        else:
            # Jika tidak ada periode aktif sebelumnya (Sistem Fresh), cuma aktifkan saja
            msg = f"Periode {target_periode.nama_periode} diaktifkan (Inisialisasi Awal)."

        # 2. Aktifkan Periode Baru
        target_periode.is_active = True
        db.session.commit()

        return jsonify({'msg': msg}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Gagal mengaktifkan periode: ' + str(e)}), 500

    except Exception as e:
        db.session.rollback()
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
        # Hapus data riwayat terkait dulu (Cascade manual jika perlu, atau andalkan DB)
        RiwayatKelas.query.filter_by(periode_id=id).delete()
        db.session.delete(p)
        db.session.commit()
        return jsonify({'msg': 'Periode dihapus'}), 200
    except Exception as e:
        return jsonify({'msg': str(e)}), 500