from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import or_
from models import db, Kriteria, User, Pertanyaan

kriteria_bp = Blueprint('kriteria', __name__)


@kriteria_bp.route('', methods=['GET'], strict_slashes=False)
@kriteria_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_kriteria():
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    query = Kriteria.query

    # LOGIKA FILTER KHUSUS PAKAR
    if role == 'pakar':
        user = User.query.get(current_user_id)
        if user and user.jenis_pakar:
            query = query.filter(
                or_(
                    Kriteria.penanggung_jawab == user.jenis_pakar,
                    Kriteria.penanggung_jawab == 'umum',
                    Kriteria.penanggung_jawab == 'all'
                )
            )

    kriterias = query.order_by(Kriteria.kode.asc()).all()

    data = []
    for k in kriterias:
        # Ambil sub-pertanyaan
        list_pertanyaan = []
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
            'list_pertanyaan': list_pertanyaan,
            'tipe_input': k.tipe_input.value if hasattr(k.tipe_input, 'value') else str(k.tipe_input),
            'opsi_pilihan': k.opsi_pilihan,  # <--- PASTIKAN INI DI-RETURN
            'atribut': k.atribut.value if hasattr(k.atribut, 'value') else str(k.atribut),
            'kategori': k.kategori.value if hasattr(k.kategori, 'value') else str(k.kategori),
            'sumber_nilai': k.sumber_nilai.value if hasattr(k.sumber_nilai, 'value') else str(k.sumber_nilai),
            'penanggung_jawab': k.penanggung_jawab if isinstance(k.penanggung_jawab, str) else k.penanggung_jawab.value,
            'tampil_di_siswa': k.tampil_di_siswa,
            'target_jalur': k.target_jalur or 'all',
            'skala_maks': k.skala_maks,
            'jalur_reverse': k.jalur_reverse
        })

    return jsonify({'data': data})


@kriteria_bp.route('', methods=['POST'], strict_slashes=False)
@kriteria_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def store():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()

    if not data.get('kode') or not data.get('nama'):
        return jsonify({'msg': 'Kode dan Nama wajib diisi'}), 400

    if Kriteria.query.filter_by(kode=data['kode']).first():
        return jsonify({'msg': 'Kode kriteria sudah ada'}), 400

    try:
        kriteria = Kriteria(
            kode=data['kode'],
            nama=data['nama'],
            tipe_input=data.get('tipe_input', 'likert'),
            # Simpan opsi pilihan (List of dicts)
            opsi_pilihan=data.get('opsi_pilihan'),  # <--- TAMBAHAN
            atribut=data.get('atribut', 'benefit'),
            kategori=data.get('kategori', 'kuesioner'),
            sumber_nilai=data.get('sumber_nilai', 'input_siswa'),
            penanggung_jawab=data.get('penanggung_jawab', 'gurubk'),
            tampil_di_siswa=bool(data.get('tampil_di_siswa', True)),
            target_jalur=data.get('target_jalur', 'all'),
            skala_maks=float(data.get('skala_maks', 5)),
            jalur_reverse=data.get('jalur_reverse') or None
        )

        pertanyaan_list = data.get('list_pertanyaan', [])
        for teks in pertanyaan_list:
            if teks:
                p = Pertanyaan(teks=teks, kriteria=kriteria)
                db.session.add(p)

        db.session.add(kriteria)
        db.session.commit()
        return jsonify({'msg': 'Kriteria berhasil ditambahkan', 'data': {'id': kriteria.id}}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 400


@kriteria_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update(id):
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    kriteria = Kriteria.query.get(id)
    if not kriteria:
        return jsonify({'msg': 'Kriteria tidak ditemukan'}), 404

    # VALIDASI HAK AKSES
    if role == 'pakar':
        user = User.query.get(current_user_id)
        if user.jenis_pakar != kriteria.penanggung_jawab and kriteria.penanggung_jawab not in ['umum', 'all']:
            return jsonify({'msg': 'Anda tidak memiliki hak akses'}), 403

    data = request.get_json()

    try:
        if role == 'admin':
            if 'kode' in data: kriteria.kode = data['kode']
            if 'nama' in data: kriteria.nama = data['nama']
            if 'tipe_input' in data: kriteria.tipe_input = data['tipe_input']

            # UPDATE OPSI PILIHAN
            if 'opsi_pilihan' in data:
                kriteria.opsi_pilihan = data['opsi_pilihan']  # <--- TAMBAHAN

            if 'atribut' in data: kriteria.atribut = data['atribut']
            if 'kategori' in data: kriteria.kategori = data['kategori']
            if 'sumber_nilai' in data: kriteria.sumber_nilai = data['sumber_nilai']
            if 'penanggung_jawab' in data: kriteria.penanggung_jawab = data['penanggung_jawab']
            if 'tampil_di_siswa' in data: kriteria.tampil_di_siswa = bool(data['tampil_di_siswa'])
            if 'target_jalur' in data: kriteria.target_jalur = data['target_jalur']
            if 'skala_maks' in data: kriteria.skala_maks = float(data['skala_maks'])
            if 'jalur_reverse' in data: kriteria.jalur_reverse = data['jalur_reverse'] or None

        # Admin & Pakar boleh edit pertanyaan (logic pertanyaan tetap sama)
        if 'list_pertanyaan' in data:
            Pertanyaan.query.filter_by(kriteria_id=kriteria.id).delete()
            new_questions = data['list_pertanyaan']
            for teks in new_questions:
                if teks and teks.strip():
                    p = Pertanyaan(teks=teks, kriteria_id=kriteria.id)
                    db.session.add(p)

        db.session.commit()
        return jsonify({'msg': 'Kriteria berhasil diupdate'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 400


@kriteria_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def destroy(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'msg': 'Akses ditolak'}), 403

    kriteria = Kriteria.query.get_or_404(id)
    try:
        db.session.delete(kriteria)
        db.session.commit()
        return jsonify({'msg': 'Kriteria dihapus'}), 200
    except Exception as e:
        return jsonify({'msg': 'Gagal menghapus data'}), 400