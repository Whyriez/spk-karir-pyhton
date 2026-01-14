import pandas as pd
import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Alumni

alumni_bp = Blueprint('alumni', __name__)


@alumni_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def index():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')

    query = Alumni.query
    if search:
        query = query.filter(Alumni.name.ilike(f'%{search}%') |
                             Alumni.major.ilike(f'%{search}%') |
                             Alumni.status.ilike(f'%{search}%'))

    pagination = query.order_by(Alumni.batch.desc()).paginate(page=page, per_page=10, error_out=False)

    data = []
    for a in pagination.items:
        data.append({
            'id': a.id,
            'name': a.name,
            'status': a.status,
            'batch': a.batch,
            'major': a.major
        })

    # Format Pagination agar mirip Laravel response structure
    return jsonify({
        'data': data,
        'meta': {
            'current_page': page,
            'last_page': pagination.pages,
            'total': pagination.total,
            'per_page': 10,
            'from': (page - 1) * 10 + 1,
            'to': min(page * 10, pagination.total)
        }
    })


@alumni_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def store():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    try:
        new_a = Alumni(
            name=data['name'],
            status=data['status'],
            batch=data['batch'],
            major=data['major']
        )
        db.session.add(new_a)
        db.session.commit()
        return jsonify({'msg': 'Data alumni ditambah'}), 201
    except Exception as e:
        return jsonify({'msg': str(e)}), 400


@alumni_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    alumni = Alumni.query.get_or_404(id)
    data = request.get_json()

    alumni.name = data.get('name', alumni.name)
    alumni.status = data.get('status', alumni.status)
    alumni.batch = data.get('batch', alumni.batch)
    alumni.major = data.get('major', alumni.major)

    db.session.commit()
    return jsonify({'msg': 'Data alumni diperbarui'}), 200


@alumni_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def destroy(id):
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    alumni = Alumni.query.get_or_404(id)
    db.session.delete(alumni)
    db.session.commit()
    return jsonify({'msg': 'Data alumni dihapus'}), 200


# --- FITUR BARU: BULK DELETE ---
@alumni_bp.route('/bulk-destroy', methods=['POST'], strict_slashes=False)
@jwt_required()
def bulk_destroy():
    claims = get_jwt()
    if claims.get('role') != 'admin': return jsonify({'msg': 'Akses ditolak'}), 403

    data = request.get_json()
    ids = data.get('ids', [])

    if not ids:
        return jsonify({'msg': 'Tidak ada data dipilih'}), 400

    try:
        # Hapus banyak data sekaligus
        Alumni.query.filter(Alumni.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'msg': f'{len(ids)} data alumni berhasil dihapus'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500


# --- FITUR BARU: PREVIEW IMPORT ---
@alumni_bp.route('/preview', methods=['POST'], strict_slashes=False)
@jwt_required()
def preview_import():
    if 'file' not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400

    file = request.files['file']
    try:
        df = pd.read_excel(file)
        # Convert NaN to None/Empty string agar JSON valid
        df = df.where(pd.notnull(df), None)

        # Mapping kolom Excel ke nama field frontend
        # Asumsi header excel: 'Nama', 'Status', 'Tahun Lulus', 'Jurusan'
        preview_data = []
        for index, row in df.iterrows():
            preview_data.append({
                'nama': row.get('Nama', ''),
                'status': row.get('Status', ''),
                'angkatan': row.get('Tahun Lulus', ''),
                'jurusan': row.get('Jurusan', '')
            })

        return jsonify(preview_data), 200
    except Exception as e:
        return jsonify({"msg": f"Gagal membaca file: {str(e)}"}), 400


# --- FITUR BARU: IMPORT FINAL ---
@alumni_bp.route('/import', methods=['POST'], strict_slashes=False)
@jwt_required()
def import_alumni():
    if 'file' not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400

    file = request.files['file']
    try:
        df = pd.read_excel(file)
        count = 0
        for index, row in df.iterrows():
            new_alumni = Alumni(
                name=row.get('Nama'),
                status=row.get('Status'),
                batch=row.get('Tahun Lulus'),
                major=row.get('Jurusan')
            )
            db.session.add(new_alumni)
            count += 1

        db.session.commit()
        return jsonify({"msg": f"{count} Data berhasil diimport"}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500


# --- FITUR BARU: DOWNLOAD TEMPLATE ---
@alumni_bp.route('/template', methods=['GET'], strict_slashes=False)
def download_template():
    # Buat file excel sederhana di memory
    df = pd.DataFrame(columns=['Nama', 'Status', 'Tahun Lulus', 'Jurusan'])
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='template_alumni.xlsx'
    )