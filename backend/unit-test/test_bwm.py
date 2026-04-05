import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
import numpy as np
from routes.bwm import calculate_bwm_weights

def test_optimasi_linprog_bwm_data_skripsi():
    print("\n[SKENARIO 1] Memastikan optimasi linier BWM berjalan menggunakan data uji riil (C1-C8)")
    print(
        "Ekspektasi: Menghasilkan 8 bobot kriteria dengan total akumulasi bobot = 1.0 dan nilai toleransi (Xi) >= 0")

    # 1. Setup Data Uji sesuai Tabel 4.1 dan Tabel 4.2
    criteria_codes = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
    best_code = 'C1'
    worst_code = 'C8'

    # Data Uji Vektor Best-to-Others (BO)
    best_to_others = {'C1': 1, 'C2': 4, 'C3': 3, 'C4': 4, 'C5': 5, 'C6': 2, 'C7': 4, 'C8': 5}

    # Data Uji Vektor Others-to-Worst (OW)
    others_to_worst = {'C1': 5, 'C2': 4, 'C3': 5, 'C4': 2, 'C5': 2, 'C6': 4, 'C7': 6, 'C8': 1}

    # 2. Panggil fungsi asli dari sistem
    weights, cr, ksi = calculate_bwm_weights(criteria_codes, best_code, worst_code, best_to_others, others_to_worst)

    # 3. Validasi
    assert len(weights) == 8
    assert np.isclose(sum(weights.values()), 1.0)  # Total bobot wajib = 1
    assert ksi >= 0.0

    print("✓ Bobot berhasil dihitung untuk 8 kriteria dan total bobot divalidasi = 1.0")


def test_validasi_consistency_ratio_sesuai_manual():
    print("\n[SKENARIO 2] Memvalidasi hasil Consistency Ratio (CR) agar sama persis dengan hitungan simulasi manual")
    print(
        "Ekspektasi: Nilai CR (Consistency Ratio) berada tepat di angka 0.0468 dengan toleransi pembulatan desimal")

    # Setup data yang sama
    criteria_codes = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
    best_code = 'C1'
    worst_code = 'C8'

    best_to_others = {'C1': 1, 'C2': 4, 'C3': 3, 'C4': 4, 'C5': 5, 'C6': 2, 'C7': 4, 'C8': 5}
    others_to_worst = {'C1': 5, 'C2': 4, 'C3': 5, 'C4': 2, 'C5': 2, 'C6': 4, 'C7': 6, 'C8': 1}

    # Eksekusi fungsi
    _, cr, _ = calculate_bwm_weights(criteria_codes, best_code, worst_code, best_to_others, others_to_worst)

    # Validasi bahwa nilai CR dari sistem eksisting (setelah di-fix) harus cocok dengan target 0.0468
    # atol=0.0001 memberikan toleransi selisih angka desimal ke-4 jika ada pembulatan
    assert np.isclose(cr, 0.0468, atol=0.0001)

    print(f"✓ Nilai CR sistem tervalidasi sangat akurat pada {cr:.4f} (Cocok dengan simulasi)")