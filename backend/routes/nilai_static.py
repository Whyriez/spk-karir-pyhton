from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from models import db, NilaiStaticJurusan, Jurusan, Kriteria, RoleEnum

nilai_static_bp = Blueprint('nilai_static', __name__)


@nilai_static_bp.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_nilai_static():
    # Ambil semua data nilai statis, dikelompokkan per jurusan
    jurusans = Jurusan.query.all()
    # Filter hanya kriteria yang sumber nilainya 'static_jurusan' (misal: C6)
    kriterias = Kriteria.query.filter_by(sumber_nilai='static_jurusan').all()

    result = []
    for j in jurusans:
        jurusan_data = {
            'id': j.id,
            'nama_jurusan': j.nama_jurusan,
            'nilai': {}
        }
        for k in kriterias:
            ns = NilaiStaticJurusan.query.filter_by(jurusan_id=j.id, kriteria_id=k.id).first()
            jurusan_data['nilai'][k.kode] = ns.nilai if ns else 0  # Default 0

        result.append(jurusan_data)

    return jsonify({
        'data': result,
        'kriteria_static': [{'id': k.id, 'kode': k.kode, 'nama': k.nama} for k in kriterias]
    })


@nilai_static_bp.route('/save', methods=['POST'])
@jwt_required()
def save_nilai_static():
    claims = get_jwt()
    # Hanya Admin atau Kaprodi yang boleh edit
    if claims.get('role') not in ['admin', 'pakar']:
        return jsonify({'msg': 'Unauthorized'}), 403

    data = request.get_json()
    jurusan_id = data.get('jurusan_id')
    nilai_map = data.get('nilai')  # Format: {'C6': 80, ...}

    if not jurusan_id or not nilai_map:
        return jsonify({'msg': 'Data tidak lengkap'}), 400

    try:
        for kode_kriteria, nilai_val in nilai_map.items():
            kriteria = Kriteria.query.filter_by(kode=kode_kriteria).first()
            if kriteria:
                # Cek existing
                obj = NilaiStaticJurusan.query.filter_by(jurusan_id=jurusan_id, kriteria_id=kriteria.id).first()
                if not obj:
                    obj = NilaiStaticJurusan(jurusan_id=jurusan_id, kriteria_id=kriteria.id)
                    db.session.add(obj)

                obj.nilai = float(nilai_val)

        db.session.commit()
        return jsonify({'msg': 'Nilai statis jurusan berhasil disimpan!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': f'Error: {str(e)}'}), 500