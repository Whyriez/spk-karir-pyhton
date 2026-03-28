from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import numpy as np
from scipy.optimize import linprog

simulation_bp = Blueprint('simulation', __name__)


# --- CORE LOGIC (HELPER FUNCTIONS) ---

def calculate_bwm_logic(criteria, best_idx, worst_idx, ab_values, aw_values):
    n = len(criteria)
    # Variabel keputusan: [w1, w2, ..., wn, xi]
    c = np.zeros(n + 1)
    c[-1] = 1  # Minimalkan xi

    A_ub = []
    b_ub = []

    # Constraint 1: |w_B - a_Bj * w_j| <= xi
    for j in range(n):
        if j == best_idx: continue
        # w_B - a_Bj * w_j - xi <= 0
        row1 = np.zeros(n + 1);
        row1[best_idx] = 1;
        row1[j] = -ab_values[j];
        row1[-1] = -1
        A_ub.append(row1);
        b_ub.append(0)
        # -w_B + a_Bj * w_j - xi <= 0
        row2 = np.zeros(n + 1);
        row2[best_idx] = -1;
        row2[j] = ab_values[j];
        row2[-1] = -1
        A_ub.append(row2);
        b_ub.append(0)

    # Constraint 2: |w_j - a_jW * w_W| <= xi
    for j in range(n):
        if j == worst_idx: continue
        # w_j - a_jW * w_W - xi <= 0
        row1 = np.zeros(n + 1);
        row1[j] = 1;
        row1[worst_idx] = -aw_values[j];
        row1[-1] = -1
        A_ub.append(row1);
        b_ub.append(0)
        # -w_j + a_jW * w_W - xi <= 0
        row2 = np.zeros(n + 1);
        row2[j] = -1;
        row2[worst_idx] = aw_values[j];
        row2[-1] = -1
        A_ub.append(row2);
        b_ub.append(0)

    # Constraint 3: Sum(w) = 1
    A_eq = [np.ones(n + 1)];
    A_eq[0][-1] = 0;
    b_eq = [1]

    # Bounds: w >= 0, xi >= 0
    bounds = [(0, None) for _ in range(n + 1)]

    # SOLVE
    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if res.success:
        weights = res.x[:-1]
        xi = res.x[-1]

        # --- BAGIAN INI YANG DIUBAH AGAR SAMA DENGAN BWM.PY ---
        ci_table = {1: 0.00, 2: 0.44, 3: 1.00, 4: 1.63, 5: 2.30, 6: 3.00, 7: 3.73, 8: 4.47, 9: 5.23}
        
        # Mengambil nilai preferensi Best terhadap Worst yang sebenarnya (bukan sekadar max)
        # best_idx adalah index Best, worst_idx adalah index Worst
        # ab_values adalah array yang berisi nilai perbandingan Best terhadap semua kriteria
        a_bw = ab_values[worst_idx] 
        
        ci = ci_table.get(int(a_bw), 5.23)
        cr = xi / ci if ci > 0 else 0
        # -----------------------------------------------------

        return {
            'success': True,
            'weights_dict': {criteria[i]: float(weights[i]) for i in range(n)},
            'weights_list': weights.tolist(),
            'xi': float(xi),
            'cr': float(cr),
            'ci': float(ci),
        }
    else:
        return {'success': False}


def calculate_moora_logic(alternatives, criteria, matrix, weights, types):
    rows, cols = matrix.shape
    norm_matrix = np.zeros((rows, cols))
    divisors = []

    for j in range(cols):
        sum_sq = np.sum(matrix[:, j] ** 2)
        divisor = np.sqrt(sum_sq)
        divisors.append(float(divisor)) # Dihapus pembulatan round()
        if divisor > 0:
            norm_matrix[:, j] = matrix[:, j] / divisor
        else:
            norm_matrix[:, j] = 0

    y_scores = []
    calculation_steps = []

    for i in range(rows):
        benefit_sum = 0; cost_sum = 0
        step_detail = {'benefit_parts': [], 'cost_parts': []}

        for j in range(cols):
            val = norm_matrix[i, j] * weights[j]
            part_str = f"({round(norm_matrix[i, j], 3)} * {round(weights[j], 3)})"

            if types[j] == 'benefit':
                benefit_sum += val
                step_detail['benefit_parts'].append(part_str)
            else:
                cost_sum += val
                step_detail['cost_parts'].append(part_str)

        yi = benefit_sum - cost_sum
        y_scores.append(float(yi)) # Dihapus pembulatan round()
        calculation_steps.append(step_detail)

    ranked_indices = np.argsort(y_scores)[::-1] 
    final_ranking = []
    for rank, idx in enumerate(ranked_indices, 1):
        final_ranking.append({
            'rank': rank, 'name': alternatives[idx], 'score': float(y_scores[idx]), 'detail': calculation_steps[idx]
        })

    return {'divisors': divisors, 'matrix_norm': norm_matrix.tolist(), 'ranking': final_ranking}

def calculate_student_moora(student_name, raw_inputs, criteria_config):
    """Fungsi yang memetakan data mentah siswa menjadi matriks keputusan Karir"""
    alternatives = ['studi', 'kerja', 'wirausaha']
    alt_names = ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha']
    num_crit = len(criteria_config)
    
    matrix = np.zeros((3, num_crit))
    for j, crit in enumerate(criteria_config):
        val = float(raw_inputs[j])
        targets = crit.get('target', 'all').lower()
        reverses = crit.get('reverse', '').lower()
        max_scale = float(crit.get('maxScale', 5))
        
        # Mapping logika target_jalur dan jalur_reverse persis seperti sistem asli (moora.py)
        for i, alt in enumerate(alternatives):
            if 'all' in targets or alt in targets:
                if alt in reverses:
                    matrix[i, j] = (max_scale + 1) - val
                else:
                    matrix[i, j] = val
            else:
                matrix[i, j] = 1 # Nilai netral jika kriteria tidak relevan untuk jalur ini
                
    weights = [float(c['weight']) for c in criteria_config]
    types = [c['type'] for c in criteria_config]
    crit_names = [c['name'] for c in criteria_config]
    
    # Jalankan optimasi MOORA pada matriks yang sudah di-mapping
    moora_res = calculate_moora_logic(alt_names, crit_names, matrix, weights, types)
    
    return {
        'student_name': student_name,
        'mapped_matrix': matrix.tolist(),
        'matrix_norm': moora_res['matrix_norm'],
        'ranking': moora_res['ranking'],
        'best_decision': moora_res['ranking'][0]['name']
    }


# --- ROUTES ---

@simulation_bp.route('/bwm', methods=['POST'])
@jwt_required()
def simulate_bwm():
    data = request.get_json()
    res = calculate_bwm_logic(
        data['criteria'], data['best_idx'], data['worst_idx'],
        np.array(data['ab_values']), np.array(data['aw_values'])
    )
    if res['success']: return jsonify(res)
    return jsonify({'msg': 'Perhitungan Gagal'}), 400


@simulation_bp.route('/moora-students', methods=['POST'])
@jwt_required()
def simulate_moora_students():
    data = request.get_json()
    students = data['students']
    matrix = data['matrix']
    criteria_config = data['criteria_config']
    
    results = []
    for idx, s_name in enumerate(students):
        raw_inputs = matrix[idx]
        res = calculate_student_moora(s_name, raw_inputs, criteria_config)
        results.append(res)
        
    return jsonify({'results': results})


@simulation_bp.route('/integrated-students', methods=['POST'])
@jwt_required()
def simulate_integrated_students():
    data = request.get_json()
    
    # 1. JALANKAN BWM
    bwm_res = calculate_bwm_logic(
        data['criteria_names'], data['best_idx'], data['worst_idx'],
        np.array(data['ab_values']), np.array(data['aw_values'])
    )
    
    if not bwm_res['success']:
        return jsonify({'msg': 'BWM Infeasible (Cek Konsistensi Input)'}), 400
        
    # 2. INJEKSI BOBOT BWM KE CONFIG KRITERIA
    criteria_config = data['criteria_config']
    for i, w in enumerate(bwm_res['weights_list']):
        criteria_config[i]['weight'] = w
        
    # 3. JALANKAN MOORA UNTUK MASING-MASING SISWA
    students = data['students']
    matrix = data['matrix']
    moora_results = []
    
    for idx, s_name in enumerate(students):
        raw_inputs = matrix[idx]
        res = calculate_student_moora(s_name, raw_inputs, criteria_config)
        moora_results.append(res)
        
    return jsonify({
        'bwm_result': bwm_res,
        'moora_results': moora_results
    })