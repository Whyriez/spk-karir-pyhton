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

        # Hitung Consistency Ratio (CR)
        ci_table = {1: 0.00, 2: 0.44, 3: 1.00, 4: 1.63, 5: 2.30, 6: 3.00, 7: 3.73, 8: 4.47, 9: 5.23}
        max_scale = max(np.max(ab_values), np.max(aw_values))
        ci = ci_table.get(int(max_scale), 5.23)
        cr = xi / ci if ci > 0 else 0

        return {
            'success': True,
            'weights_dict': {criteria[i]: round(weights[i], 4) for i in range(n)},
            'weights_list': weights.tolist(),
            'xi': round(xi, 5),
            'cr': round(cr, 4)
        }
    else:
        return {'success': False}


def calculate_moora_logic(alternatives, criteria, matrix, weights, types):
    rows, cols = matrix.shape
    norm_matrix = np.zeros((rows, cols))
    divisors = []

    # 1. Normalisasi
    for j in range(cols):
        sum_sq = np.sum(matrix[:, j] ** 2)
        divisor = np.sqrt(sum_sq)
        divisors.append(round(divisor, 4))
        if divisor > 0:
            norm_matrix[:, j] = matrix[:, j] / divisor
        else:
            norm_matrix[:, j] = 0

    # 2. Optimasi (Menghitung Yi)
    y_scores = []
    calculation_steps = []

    for i in range(rows):
        benefit_sum = 0
        cost_sum = 0
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
        y_scores.append(round(yi, 4))
        calculation_steps.append(step_detail)

    # 3. Perankingan
    ranked_indices = np.argsort(y_scores)[::-1]  # Descending sort
    final_ranking = []
    for rank, idx in enumerate(ranked_indices, 1):
        final_ranking.append({
            'rank': rank,
            'name': alternatives[idx],
            'score': y_scores[idx],
            'detail': calculation_steps[idx]
        })

    return {
        'divisors': divisors,
        'matrix_norm': norm_matrix.tolist(),
        'ranking': final_ranking
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


@simulation_bp.route('/moora', methods=['POST'])
@jwt_required()
def simulate_moora():
    data = request.get_json()
    res = calculate_moora_logic(
        data['alternatives'], data['criteria'],
        np.array(data['matrix']), np.array(data['weights']), data['types']
    )
    return jsonify(res)


@simulation_bp.route('/integrated', methods=['POST'])
@jwt_required()
def simulate_integrated():
    """
    ENDPOINT SPESIAL: Menerima input BWM & MOORA sekaligus.
    Output BWM (Bobot) langsung dilempar ke fungsi MOORA.
    """
    data = request.get_json()

    # 1. JALANKAN BWM
    bwm_res = calculate_bwm_logic(
        data['criteria'], data['best_idx'], data['worst_idx'],
        np.array(data['ab_values']), np.array(data['aw_values'])
    )

    if not bwm_res['success']:
        return jsonify({'msg': 'BWM Infeasible (Cek Konsistensi Input)'}), 400

    # Ambil bobot hasil BWM untuk dipakai MOORA
    weights_from_bwm = bwm_res['weights_list']

    # 2. JALANKAN MOORA (Pakai bobot dari BWM)
    moora_res = calculate_moora_logic(
        data['alternatives'], data['criteria'],
        np.array(data['matrix']), np.array(weights_from_bwm), data['types']
    )

    return jsonify({
        'bwm_result': bwm_res,
        'moora_result': moora_res
    })