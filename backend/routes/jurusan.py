from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models import db, Jurusan, Kriteria, NilaiStaticJurusan, User, RoleEnum

jurusan_bp = Blueprint('jurusan', __name__)


@jurusan_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def index():
    # Public read (bisa dipakai saat register/form)
    data = Jurusan.query.order_by(Jurusan.kode_jurusan.asc()).all()
    res = [{'id': j.id, 'kode': j.kode_jurusan, 'nama': j.nama_jurusan} for j in data]
    return jsonify({'data': res})


@jurusan_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_jurusan():
    """
    Endpoint khusus untuk Kaprodi mendapatkan jurusannya sendiri.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Validasi Role
    if not user or user.role != RoleEnum.pakar or user.jenis_pakar != 'kaprodi':
        return jsonify({'msg': 'Akses ditolak. Hanya untuk Kaprodi.'}), 403

    # Cek apakah Kaprodi sudah punya jurusan
    if not user.jurusan_id:
        return jsonify({'data': []}), 200 # Return kosong valid

    jurusan = Jurusan.query.get(user.jurusan_id)
    if not jurusan:
        return jsonify({'data': []}), 200

    # Return format list (isi 1) agar frontend tabel tetap bisa map()
    return jsonify({'data': [{
        'id': jurusan.id,
        'kode': jurusan.kode_jurusan,
        'nama': jurusan.nama_jurusan
    }]})

@jurusan_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def store():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    if not data.get('kode') or not data.get('nama'):
        return jsonify({'msg': 'Data tidak lengkap'}), 400

    if Jurusan.query.filter_by(kode_jurusan=data['kode']).first():
        return jsonify({'msg': 'Kode jurusan sudah ada'}), 400

    new_j = Jurusan(kode_jurusan=data['kode'], nama_jurusan=data['nama'])
    db.session.add(new_j)
    db.session.commit()
    return jsonify({'msg': 'Jurusan berhasil ditambah'}), 201


@jurusan_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    jurusan = Jurusan.query.get_or_404(id)
    data = request.get_json()

    jurusan.nama_jurusan = data.get('nama', jurusan.nama_jurusan)
    # Kode biasanya tidak diubah, tapi kalau mau diubah perlu cek unik lagi

    db.session.commit()
    return jsonify({'msg': 'Jurusan diperbarui'}), 200


@jurusan_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def destroy(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    jurusan = Jurusan.query.get_or_404(id)
    db.session.delete(jurusan)
    db.session.commit()
    return jsonify({'msg': 'Jurusan dihapus'}), 200


@jurusan_bp.route('/<int:id>/static-values', methods=['GET'])
@jwt_required()
def get_static_values(id):
    # Ambil Jurusan
    jurusan = Jurusan.query.get_or_404(id)

    # Ambil semua Kriteria yang bertipe 'static_jurusan'
    # Ini kriteria yang nilainya tetap untuk setiap jurusan (misal: Biaya Masuk, Jarak Kampus Pusat, dll)
    kriterias = Kriteria.query.filter_by(sumber_nilai='static_jurusan').order_by(Kriteria.kode.asc()).all()

    results = []
    for k in kriterias:
        # Cek apakah sudah ada nilainya di DB
        existing = NilaiStaticJurusan.query.filter_by(jurusan_id=id, kriteria_id=k.id).first()
        val = existing.nilai if existing else 0

        results.append({
            'kriteria_id': k.id,
            'kode': k.kode,
            'nama': k.nama,
            'nilai': val,
            'skala_maks': k.skala_maks,  # <--- ADDED: Penting untuk validasi frontend
            'tipe_input': k.tipe_input.value if hasattr(k.tipe_input, 'value') else str(k.tipe_input)
        })

    return jsonify({
        'jurusan': {'id': jurusan.id, 'nama': jurusan.nama_jurusan},
        'values': results
    })


@jurusan_bp.route('/<int:id>/static-values', methods=['POST'])
@jwt_required()
def save_static_values(id):
    claims = get_jwt()
    if claims.get('role') not in ['admin', 'pakar']:
        return jsonify({'msg': 'Akses ditolak'}), 403

    jurusan = Jurusan.query.get_or_404(id)
    data = request.get_json()
    items = data.get('items', [])  # List of {kriteria_id: 1, nilai: 90}

    try:
        for item in items:
            kid = item.get('kriteria_id')
            val = item.get('nilai')

            # Cari atau Buat
            obj = NilaiStaticJurusan.query.filter_by(jurusan_id=id, kriteria_id=kid).first()
            if not obj:
                obj = NilaiStaticJurusan(jurusan_id=id, kriteria_id=kid)
                db.session.add(obj)

            obj.nilai = float(val) if val is not None else 0

        db.session.commit()
        return jsonify({'msg': 'Data nilai statis berhasil disimpan'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error saving data: ' + str(e)}), 500