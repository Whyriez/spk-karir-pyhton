import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
import numpy as np
from routes.simulation import calculate_moora_logic

def test_normalisasi_dan_optimasi_moora():
    print("\n[SKENARIO 1] Memastikan sistem asli menghitung normalisasi dan optimasi MOORA")
    print(
        "Ekspektasi: Nilai normalisasi matriks [0][0] bernilai ~0.742 dan data perankingan terurut menurun (skor tertinggi di ranking 1)")

    # 1. Setup Data Uji untuk 3 alternatif dan 2 kriteria
    alternatives = ['Melanjutkan Studi', 'Bekerja', 'Berwirausaha']
    criteria = ['C1', 'C2']

    # Matriks 3 Alternatif x 2 Kriteria
    matrix = np.array([
        [4, 2],
        [3, 4],
        [2, 1]
    ])
    weights = [0.6, 0.4]
    types = ['benefit', 'cost']

    # 2. Panggil fungsi asli dari sistem
    result = calculate_moora_logic(alternatives, criteria, matrix, weights, types)

    # 3. Ambil hasil dari fungsi
    norm_matrix = result['matrix_norm']
    ranking = result['ranking']

    # --- VALIDASI NORMALISASI ---
    # Ekspektasi norm_matrix[0][0] = 4 / sqrt(4^2 + 3^2 + 2^2) = 4 / sqrt(29) = 4 / 5.385 = ~0.742
    assert np.isclose(norm_matrix[0][0], 0.742, atol=0.01)
    print("✓ Normalisasi Euclidean kode asli valid.")

    # --- VALIDASI RANKING DAN OPTIMASI YI ---
    # Pastikan output ranking lengkap untuk 3 alternatif
    assert len(ranking) == 3

    # Memastikan struktur data dari fungsi asli sesuai ekspektasi
    assert 'rank' in ranking[0]
    assert 'name' in ranking[0]
    assert 'score' in ranking[0]

    # Memastikan perankingan benar (alternatif dengan skor tertinggi harus di atas)
    assert ranking[0]['score'] >= ranking[1]['score']
    assert ranking[1]['score'] >= ranking[2]['score']
    print("✓ Perhitungan nilai akhir (Yi) dan perankingan valid.")