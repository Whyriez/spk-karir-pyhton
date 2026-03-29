import { useState } from 'react';
import Header from "../../../components/Header.tsx";
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';

const truncateTo4Decimals = (num: number) => {
    const match = num.toString().match(/^-?\d+(?:\.\d{0,4})?/);
    return match ? match[0] : num.toString();
};

export default function SimulationIndex() {
    const [activeTab, setActiveTab] = useState<'BWM' | 'MOORA' | 'INTEGRATED'>('BWM');

    return (
        <div>
            <Header>
                <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-xl text-gray-800">Lab Simulasi Keputusan Karir</h2>
                </div>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit overflow-x-auto">
                        <button onClick={() => setActiveTab('BWM')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'BWM' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}>1. Simulasi BWM</button>
                        <button onClick={() => setActiveTab('MOORA')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'MOORA' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}>2. Simulasi Data Siswa (MOORA)</button>
                        <button onClick={() => setActiveTab('INTEGRATED')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'INTEGRATED' ? 'bg-white shadow text-purple-600 font-bold' : 'text-gray-600 hover:bg-gray-300'}`}>3. Simulasi Integrasi Karir</button>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border-t-4 border-indigo-500">
                        {activeTab === 'BWM' && <BWMSimulation />}
                        {activeTab === 'MOORA' && <MOORASimulation />}
                        {activeTab === 'INTEGRATED' && <IntegratedSimulation />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 1. BWM SIMULATION
// ============================================================================
function BWMSimulation() {
    const [criteria] = useState([
        'C1: Nilai Akademik',
        'C2: Minat Lanjut Studi',
        'C3: Minat Lanjut Kerja',
        'C4: Kondisi Ekonomi',
        'C5: Motivasi & Dukungan Ortu',
        'C6: Ketersediaan Lap. Kerja',
        'C7: Minat Wirausaha',
        'C8: Ketersediaan Modal/Aset'
    ]);
    const [bestIdx] = useState(0); // C1: Nilai Akademik
    const [worstIdx] = useState(7); // C8: Ketersediaan Modal/Aset

    // Sesuai Input Wawancara (1 untuk diri sendiri)
    const [abVector, setAbVector] = useState([1, 4, 3, 4, 5, 2, 4, 5]);
    const [awVector, setAwVector] = useState([5, 4, 5, 2, 2, 4, 6, 1]);
    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const res = await apiClient.post('/simulation/bwm', {
                criteria, best_idx: bestIdx, worst_idx: worstIdx, ab_values: abVector, aw_values: awVector
            });
            setResult(res.data);
        } catch (err) { alert('Perhitungan Gagal. Cek Konsistensi Input.'); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
                <strong>Skenario BWM:</strong> Hitung nilai bobot prioritas 8 kriteria berdasarkan komparasi Pakar (Guru BK & Kaprodi RPL).
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Best ({criteria[bestIdx]}) vs Others:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {criteria.map((c, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs truncate mr-2" title={`Best vs ${c}`}>Best ➔ C{i + 1}</span>
                                    <input type="number" min="1" max="9" className="w-14 border-gray-300 rounded text-center text-xs p-1" value={abVector[i]} disabled={i === bestIdx} onChange={(e) => { const n = [...abVector]; n[i] = parseInt(e.target.value); setAbVector(n); }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 mt-4">Others vs Worst ({criteria[worstIdx]}):</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {criteria.map((c, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs truncate mr-2" title={`${c} vs Worst`}>C{i + 1} ➔ Worst</span>
                                    <input type="number" min="1" max="9" className="w-14 border-gray-300 rounded text-center text-xs p-1" value={awVector[i]} disabled={i === worstIdx} onChange={(e) => { const n = [...awVector]; n[i] = parseInt(e.target.value); setAwVector(n); }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <PrimaryButton onClick={handleCalculate} className="w-full justify-center mt-4">Hitung Bobot</PrimaryButton>
                </div>
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-auto shadow-xl">
                    <h3 className="font-bold text-white border-b border-gray-700 pb-2 mb-4">Hasil BWM</h3>
                    {!result ? <p className="text-gray-500">// Menunggu eksekusi komputasi...</p> : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-400 mb-2"># Bobot Optimal (w*):</p>
                                {Object.entries(result.weights_dict).map(([k, v]: any) => (
                                    <div key={k} className="flex justify-between items-center py-0.5"><span className="text-gray-300">{k}:</span><span className="font-bold text-white">{truncateTo4Decimals(v)}</span></div>
                                ))}
                            </div>
                            <div className="border-t border-gray-700 pt-3 mt-3 space-y-1">
                                <p className="text-gray-400 mb-1"># Evaluasi Konsistensi:</p>
                                <div className="flex justify-between"><span className="text-gray-300">Deviasi (Ksi*)</span><span className="text-yellow-400 font-bold">{truncateTo4Decimals(result.xi)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-300">CR (Ksi/CI)</span><span className="text-pink-400 font-bold">{truncateTo4Decimals(result.cr)}</span></div>
                            </div>
                            <div className={`mt-4 p-2 rounded text-center font-bold uppercase tracking-wider ${result.cr <= 0.1 ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
                                Status: {result.cr <= 0.1 ? 'Konsisten' : 'Tidak Konsisten'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 2. MOORA SIMULATION (STUDENT CAREER MAPPING)
// ============================================================================
function MOORASimulation() {
    // DITAMBAHKAN: Siswa D dan E
    const [students] = useState(['Siswa A (Studi)', 'Siswa B (Kerja)', 'Siswa C (Wirausaha)', 'Siswa D', 'Siswa E']);

    // Konfigurasi 8 Kriteria
    const [criteriaConfig, setCriteriaConfig] = useState([
        { name: 'C1: Akademik', type: 'benefit', target: 'all', reverse: '', maxScale: 100, weight: 0.2779878971255674 },
        { name: 'C2: Minat Studi', type: 'benefit', target: 'studi', reverse: '', maxScale: 5, weight: 0.09644478063540093 },
        { name: 'C3: Minat Kerja', type: 'benefit', target: 'kerja', reverse: '', maxScale: 5, weight: 0.12859304084720125 },
        { name: 'C4: Ekonomi', type: 'benefit', target: 'all', reverse: 'kerja', maxScale: 5, weight: 0.09644478063540093 },
        { name: 'C5: Motivasi Ortu', type: 'benefit', target: 'all', reverse: '', maxScale: 5, weight: 0.07715582450832074 },
        { name: 'C6: Lapangan Kerja', type: 'benefit', target: 'studi, kerja', reverse: '', maxScale: 5, weight: 0.19288956127080187 },
        { name: 'C7: Minat Wirausaha', type: 'benefit', target: 'wirausaha', reverse: '', maxScale: 5, weight: 0.0964447806354009 },
        { name: 'C8: Modal/Aset', type: 'benefit', target: 'wirausaha', reverse: '', maxScale: 5, weight: 0.03403933434190621 }
    ]);

    // DITAMBAHKAN: Data Siswa D dan E
    const [matrix, setMatrix] = useState([
        [90, 5, 1, 4, 5, 4, 1, 1], // Siswa A
        [75, 1, 5, 2, 4, 5, 1, 1], // Siswa B
        [80, 1, 1, 5, 4, 1, 5, 5], // Siswa C
        [82, 4, 4, 3, 4, 3, 1, 2], // Siswa D
        [76, 1, 2, 3, 3, 2, 5, 2]  // Siswa E
    ]);

    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const res = await apiClient.post('/simulation/moora-students', { students, matrix, criteria_config: criteriaConfig });
            setResult(res.data.results);
        } catch (err) { alert('Gagal Hitung MOORA'); }
    };

    const updateConfig = (idx: number, field: string, val: string) => {
        const newC = [...criteriaConfig];
        newC[idx] = { ...newC[idx], [field]: val };
        setCriteriaConfig(newC);
    };

    const updateMatrix = (r: number, c: number, val: string) => {
        const newM = [...matrix]; newM[r][c] = parseFloat(val) || 0; setMatrix(newM);
    };

    return (
        <div className="space-y-8">
            <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800">
                <strong>Skenario Sistem Nyata:</strong> Masukkan data mentah kuesioner siswa (8 Atribut). Sistem akan memetakannya menjadi Matriks Jalur Karir untuk meranking Keputusan Terbaik.
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* SETTING MAPPING */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-2">1. Logika Pemetaan Kriteria</h3>
                    <div className="overflow-x-auto border border-gray-300 rounded shadow-sm">
                        <table className="min-w-full text-xs text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">Kriteria</th>
                                    <th className="p-2">Target</th>
                                    <th className="p-2">Reverse</th>
                                    <th className="p-2">Max</th>
                                    <th className="p-2">Bobot Manual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {criteriaConfig.map((c, i) => (
                                    <tr key={i} className="bg-white">
                                        <td className="p-2 font-bold whitespace-nowrap">{c.name}</td>
                                        <td className="p-1"><input className="w-20 p-1 border rounded text-[10px]" value={c.target} onChange={e => updateConfig(i, 'target', e.target.value)} /></td>
                                        <td className="p-1"><input className="w-20 p-1 border rounded text-[10px]" value={c.reverse} onChange={e => updateConfig(i, 'reverse', e.target.value)} /></td>
                                        <td className="p-1"><input type="number" className="w-14 p-1 border rounded text-[10px]" value={c.maxScale} onChange={e => updateConfig(i, 'maxScale', e.target.value)} /></td>
                                        <td className="p-1"><input type="number" step="0.0001" className="w-16 p-1 border rounded text-[10px] text-indigo-700 font-bold" value={c.weight} onChange={e => updateConfig(i, 'weight', e.target.value)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DATA SISWA */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-2">2. Input Data Mentah Siswa</h3>
                    <div className="overflow-x-auto border border-gray-300 rounded shadow-sm">
                        <table className="min-w-full text-sm text-center">
                            <thead className="bg-indigo-50">
                                <tr>
                                    <th className="p-2 text-left text-xs">Siswa</th>
                                    {criteriaConfig.map((_, i) => <th key={i} className="p-2 text-[10px] text-indigo-700">C{i + 1}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {students.map((s, r) => (
                                    <tr key={r} className="bg-white">
                                        <td className="p-2 font-bold text-xs text-left whitespace-nowrap">{s}</td>
                                        {criteriaConfig.map((_, c) => (
                                            <td key={c} className="p-1"><input type="number" className="w-12 p-1 text-center border rounded text-xs" value={matrix[r][c]} onChange={e => updateMatrix(r, c, e.target.value)} /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-end"><PrimaryButton onClick={handleCalculate}>Proses Rekomendasi Karir</PrimaryButton></div>
                </div>
            </div>

            {/* HASIL KEPUTUSAN */}
            {result && (
                <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                    <h3 className="font-bold text-gray-800 text-lg">Hasil Keputusan Orientasi Karir</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {result.map((res: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-200 shadow-md rounded-lg p-5">
                                <div className="text-gray-500 font-bold mb-1">{res.student_name}</div>
                                <div className="text-xl font-black text-emerald-600 mb-4">{res.best_decision}</div>

                                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide border-b pb-1">Detail Peringkat:</div>
                                <div className="space-y-2 mb-4">
                                    {res.ranking.map((rk: any) => (
                                        <div key={rk.rank} className="flex justify-between text-sm">
                                            <span className="font-medium">#{rk.rank} {rk.name}</span>
                                            <span className="font-bold text-gray-700">{truncateTo4Decimals(rk.score)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* TAMBAHAN: Tabel Matriks Normalisasi */}
                                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide border-b pb-1">Matriks Normalisasi:</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[9px] text-center border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-gray-200 p-1 text-left">Alt</th>
                                                {criteriaConfig.map((_, i) => <th key={i} className="border border-gray-200 p-1">C{i + 1}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {['Studi', 'Kerja', 'Wirausaha'].map((alt, r) => (
                                                <tr key={r}>
                                                    <td className="border border-gray-200 p-1 text-left font-bold">{alt}</td>
                                                    {res.matrix_norm[r].map((val: number, c: number) => (
                                                        <td key={c} className="border border-gray-200 p-1">{truncateTo4Decimals(val)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* END TAMBAHAN */}

                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 3. INTEGRATED SIMULATION (FULL FLOW)
// ============================================================================
function IntegratedSimulation() {
    const [bestIdx] = useState(0); // C1
    const [worstIdx] = useState(7); // C8

    // Default values sesuai wawancara Pakar
    const [abVector, setAbVector] = useState([1, 4, 3, 4, 5, 2, 4, 5]);
    const [awVector, setAwVector] = useState([5, 4, 5, 2, 2, 4, 6, 1]);

    // DITAMBAHKAN: Siswa D dan E
    const [students] = useState(['Siswa A (Studi)', 'Siswa B (Kerja)', 'Siswa C (Wirausaha)', 'Siswa D', 'Siswa E']);

    const [criteriaConfig, setCriteriaConfig] = useState([
        { name: 'C1: Akademik', type: 'benefit', target: 'all', reverse: '', maxScale: 100 },
        { name: 'C2: Minat Studi', type: 'benefit', target: 'studi', reverse: '', maxScale: 5 },
        { name: 'C3: Minat Kerja', type: 'benefit', target: 'kerja', reverse: '', maxScale: 5 },
        { name: 'C4: Ekonomi', type: 'benefit', target: 'all', reverse: 'kerja', maxScale: 5 },
        { name: 'C5: Motivasi Ortu', type: 'benefit', target: 'all', reverse: '', maxScale: 5 },
        { name: 'C6: Lapangan Kerja', type: 'benefit', target: 'studi, kerja', reverse: '', maxScale: 5 },
        { name: 'C7: Minat Wirausaha', type: 'benefit', target: 'wirausaha', reverse: '', maxScale: 5 },
        { name: 'C8: Modal/Aset', type: 'benefit', target: 'wirausaha', reverse: '', maxScale: 5 }
    ]);

    // DITAMBAHKAN: Data Siswa D dan E
    const [matrix, setMatrix] = useState([
        [90, 5, 1, 4, 5, 4, 1, 1],
        [75, 1, 5, 2, 4, 5, 1, 1],
        [80, 1, 1, 5, 4, 1, 5, 5],
        [82, 4, 4, 3, 4, 3, 1, 2],
        [76, 1, 2, 3, 3, 2, 5, 2]
    ]);

    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const criteriaNames = criteriaConfig.map(c => c.name);
            const res = await apiClient.post('/simulation/integrated-students', {
                criteria_names: criteriaNames, best_idx: bestIdx, worst_idx: worstIdx,
                ab_values: abVector, aw_values: awVector,
                students, matrix, criteria_config: criteriaConfig
            });
            setResult(res.data);
        } catch (err) { alert('Perhitungan Gagal. Cek data input BWM atau MOORA.'); }
    };

    const updateConfig = (idx: number, field: string, val: string) => {
        const newC = [...criteriaConfig];
        newC[idx] = { ...newC[idx], [field]: val };
        setCriteriaConfig(newC);
    };

    const updateMatrix = (r: number, c: number, val: string) => {
        const newM = [...matrix]; newM[r][c] = parseFloat(val) || 0; setMatrix(newM);
    };

    return (
        <div className="space-y-8">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-800 text-lg mb-2">Simulasi Alur Penuh (Dinamic End-to-End)</h3>
                <p className="text-sm text-purple-700">
                    Bobot 8 Kriteria <strong>otomatis diekstrak</strong> dari penilaian Pakar (BWM) dan diteruskan ke matriks pemetaan siswa (MOORA).
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* KIRI: INPUT BWM & SISWA */}
                <div className="xl:col-span-8 space-y-6 pr-4 xl:border-r border-gray-300">

                    {/* TAHAP 1: INPUT BWM */}
                    <div className="bg-gray-50 p-4 rounded border border-gray-300">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">TAHAP 1: BWM</span>
                            <span className="text-xs font-bold text-gray-500">Preferensi Pakar (8 Kriteria)</span>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                            {criteriaConfig.map((_, i) => (
                                <div key={i} className="text-center">
                                    <span className="text-[10px] block text-gray-500 line-clamp-1">Best-C{i + 1}</span>
                                    <input type="number" className="w-full text-center border-gray-300 rounded text-xs p-1" value={abVector[i]} disabled={i === bestIdx} onChange={e => { const n = [...abVector]; n[i] = parseInt(e.target.value); setAbVector(n) }} />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {criteriaConfig.map((_, i) => (
                                <div key={i} className="text-center">
                                    <span className="text-[10px] block text-gray-500 line-clamp-1">C{i + 1}-Worst</span>
                                    <input type="number" className="w-full text-center border-gray-300 rounded text-xs p-1" value={awVector[i]} disabled={i === worstIdx} onChange={e => { const n = [...awVector]; n[i] = parseInt(e.target.value); setAwVector(n) }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TAHAP 2: ATURAN & MAPPING MOORA */}
                    <div className="bg-gray-50 p-4 rounded border border-gray-300">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">TAHAP 2: LOGIKA MOORA</span>
                            <span className="text-xs font-bold text-gray-500">Aturan & Data Siswa</span>
                        </div>

                        {/* Tabel Konfigurasi Aturan (Dinamis) */}
                        <div className="overflow-x-auto mb-4 rounded border border-gray-200">
                            <table className="w-full text-[10px] text-left bg-white">
                                <thead className="bg-gray-200 text-gray-700">
                                    <tr>
                                        <th className="p-2 w-1/4">Kriteria</th>
                                        <th className="p-2 w-1/4">Target Jalur</th>
                                        <th className="p-2 w-1/4">Reverse Jalur</th>
                                        <th className="p-2 text-center">Maks Skala</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {criteriaConfig.map((c, i) => (
                                        <tr key={i}>
                                            <td className="p-1 pl-2 font-bold text-gray-600">
                                                <input className="w-full border-none p-0 focus:ring-0 text-[10px] font-bold truncate" value={c.name} onChange={e => updateConfig(i, 'name', e.target.value)} />
                                            </td>
                                            <td className="p-1"><input className="w-full border border-gray-300 rounded px-1 py-0.5 text-[10px]" value={c.target} onChange={e => updateConfig(i, 'target', e.target.value)} /></td>
                                            <td className="p-1"><input className="w-full border border-gray-300 rounded px-1 py-0.5 text-[10px]" value={c.reverse} onChange={e => updateConfig(i, 'reverse', e.target.value)} /></td>
                                            <td className="p-1 text-center"><input type="number" className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-[10px]" value={c.maxScale} onChange={e => updateConfig(i, 'maxScale', e.target.value)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Tabel Data Mentah Siswa */}
                        <div className="overflow-x-auto rounded border border-gray-200">
                            <table className="w-full text-xs text-center bg-white">
                                <thead className="bg-emerald-50 text-emerald-800">
                                    <tr>
                                        <th className="p-2 text-left">Nama Siswa</th>
                                        {criteriaConfig.map((_, i) => <th key={i} className="p-2 text-[10px]">C{i + 1}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((s, r) => (
                                        <tr key={r}>
                                            <td className="font-bold text-xs p-2 text-left text-gray-700 whitespace-nowrap">{s}</td>
                                            {criteriaConfig.map((_, c) => (
                                                <td key={c} className="p-1"><input type="number" className="w-10 text-center border-gray-300 rounded text-[10px] p-1" value={matrix[r][c]} onChange={e => updateMatrix(r, c, e.target.value)} /></td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <PrimaryButton onClick={handleCalculate} className="w-full justify-center h-12 text-lg shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600">
                        Jalankan Simulasi Integrasi
                    </PrimaryButton>
                </div>

                {/* KANAN: HASIL KEPUTUSAN */}
                <div className="xl:col-span-4">
                    {!result ? (
                        <div className="h-full min-h-[300px] flex items-center justify-center text-gray-400 italic bg-gray-50 rounded border border-dashed text-sm p-4 text-center">Hasil keputusan & perankingan akan muncul di sini...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Hasil Bobot BWM */}
                            <div className="bg-indigo-900 text-white p-4 rounded-lg shadow-md animate-fade-in-up">
                                <h4 className="font-bold mb-3 border-b border-indigo-700 pb-2 text-sm flex justify-between items-center">
                                    <span>Bobot Otomatis (BWM)</span>
                                    <span className="text-[10px] bg-indigo-800 px-2 py-1 rounded">CR: {truncateTo4Decimals(result.bwm_result.cr)}</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(result.bwm_result.weights_dict).map(([k, v]: any) => (
                                        <div key={k} className="text-center bg-indigo-950 p-2 rounded">
                                            <div className="text-[9px] text-indigo-300 line-clamp-1 mb-1">{k.split(':')[0]}</div>
                                            <div className="font-bold text-yellow-400 text-sm">{truncateTo4Decimals(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hasil Perankingan MOORA */}
                            <div className="grid gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <h4 className="font-bold text-gray-700 border-b pb-1">Hasil Rekomendasi Karir</h4>
                                {result.moora_results.map((res: any, idx: number) => (
                                    <div key={idx} className="bg-white border-l-4 border-emerald-500 rounded shadow p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-gray-500 font-bold text-xs">{res.student_name}</div>
                                            <div className="text-sm font-black text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded">{res.best_decision}</div>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            {res.ranking.map((rk: any, i: number) => (
                                                <div key={i} className={`flex justify-between text-[11px] ${i === 0 ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
                                                    <span>#{rk.rank} {rk.name}</span>
                                                    <span>{truncateTo4Decimals(rk.score)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* TAMBAHAN: Tabel Matriks Normalisasi */}
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="text-[10px] text-gray-500 font-bold mb-1">Matriks Normalisasi:</div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-[8px] text-center border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="border border-gray-200 p-1 text-left">Alt</th>
                                                            {criteriaConfig.map((_, i) => <th key={i} className="border border-gray-200 p-1">C{i + 1}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {['Studi', 'Kerja', 'Wirausaha'].map((alt, r) => (
                                                            <tr key={r}>
                                                                <td className="border border-gray-200 p-1 text-left font-bold text-gray-600">{alt}</td>
                                                                {res.matrix_norm[r].map((val: number, c: number) => (
                                                                    <td key={c} className="border border-gray-200 p-1 text-gray-500">{truncateTo4Decimals(val)}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        {/* END TAMBAHAN */}

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}