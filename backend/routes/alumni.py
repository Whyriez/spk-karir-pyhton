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
    filter_batch = request.args.get('batch', '')
    filter_major = request.args.get('major', '')

    query = Alumni.query
    
    if search:
        query = query.filter(Alumni.name.ilike(f'%{search}%') |
                             Alumni.major.ilike(f'%{search}%') |
                             Alumni.status.ilike(f'%{search}%'))
                             
    if filter_batch:
        query = query.filter(Alumni.batch == filter_batch)
        
    if filter_major:
        query = query.filter(Alumni.major == filter_major)

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

    return jsonify({
        'data': data,
        'meta': {
            'current_page': page,
            'last_page': pagination.pages,
            'total': pagination.total,
            'per_page': 10,
            'from': (page - 1) * 10 + 1 if pagination.total > 0 else 0,
            'to': min(page * 10, pagination.total)
        }
    })

# --- ENDPOINT BARU: AMBIL FILTER UNIK ---
@alumni_bp.route('/filters', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_filters():
    # Ambil Angkatan Unik
    batches = db.session.query(Alumni.batch).distinct().filter(Alumni.batch.isnot(None)).order_by(Alumni.batch.desc()).all()
    # Ambil Jurusan Unik
    majors = db.session.query(Alumni.major).distinct().filter(Alumni.major.isnot(None)).order_by(Alumni.major.asc()).all()
    
    return jsonify({
        'batches': [str(b[0]).strip() for b in batches if str(b[0]).strip() != ''],
        'majors': [str(m[0]).strip() for m in majors if str(m[0]).strip() != '']
    }), 200


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
        Alumni.query.filter(Alumni.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'msg': f'{len(ids)} data alumni berhasil dihapus'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500


@alumni_bp.route('/preview', methods=['POST'], strict_slashes=False)
@jwt_required()
def preview_import():
    if 'file' not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400

    file = request.files['file']
    try:
        df = pd.read_excel(file)
        df = df.where(pd.notnull(df), None)

        preview_data = []
        for index, row in df.iterrows():
            preview_data.append({
                'nama': row.get('Nama', ''),
                'status': row.get('Status', ''),
                'angkatan': str(row.get('Tahun Lulus', '')).replace('.0', ''), # Hapus desimal dari excel
                'jurusan': row.get('Jurusan', '')
            })

        return jsonify(preview_data), 200
    except Exception as e:
        return jsonify({"msg": f"Gagal membaca file: {str(e)}"}), 400


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
                batch=str(row.get('Tahun Lulus')).replace('.0', ''),
                major=row.get('Jurusan')
            )
            db.session.add(new_alumni)
            count += 1

        db.session.commit()
        return jsonify({"msg": f"{count} Data berhasil diimport"}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500


@alumni_bp.route('/template', methods=['GET'], strict_slashes=False)
def download_template():
    df = pd.DataFrame(columns=['Nama', 'Status', 'Tahun Lulus', 'Jurusan'])
    df.loc[0] = ['Contoh Siswa', 'Bekerja di PT XYZ', '2023', 'Rekayasa Perangkat Lunak']
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
        
        worksheet = writer.sheets['Sheet1']
        worksheet.set_column('A:A', 30)
        worksheet.set_column('B:B', 30)
        worksheet.set_column('C:C', 15)
        worksheet.set_column('D:D', 30)
        
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='template_alumni.xlsx'
    )