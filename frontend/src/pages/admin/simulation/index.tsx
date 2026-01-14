import { useState } from 'react';
import Header from "../../../components/Header.tsx";
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';

export default function SimulationIndex() {
    const [activeTab, setActiveTab] = useState<'BWM' | 'MOORA' | 'INTEGRATED'>('BWM');

    return (
        <div>
            <Header>
                <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-xl text-gray-800">Lab Simulasi Algoritma</h2>
                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* TABS NAVIGATION */}
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit overflow-x-auto">
                        <button onClick={() => setActiveTab('BWM')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'BWM' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}>
                            1. Simulasi BWM
                        </button>
                        <button onClick={() => setActiveTab('MOORA')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'MOORA' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}>
                            2. Simulasi MOORA
                        </button>
                        <button onClick={() => setActiveTab('INTEGRATED')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'INTEGRATED' ? 'bg-white shadow text-purple-600 font-bold' : 'text-gray-600 hover:bg-gray-300'}`}>
                            3. Integrasi (BWM ➔ MOORA)
                        </button>
                    </div>

                    {/* CONTENT AREA */}
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
// COMPONENT 1: BWM SIMULATION (STANDALONE)
// ============================================================================
function BWMSimulation() {
    const [criteria] = useState(['C1: Akademik', 'C2: Ekonomi', 'C3: Minat Studi', 'C4: Motivasi']);
    const [bestIdx] = useState(2); // C3
    const [worstIdx] = useState(1); // C2

    const [abVector, setAbVector] = useState([4, 8, 1, 3]);
    const [awVector, setAwVector] = useState([4, 1, 8, 3]);

    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const res = await apiClient.post('/simulation/bwm', {
                criteria, best_idx: bestIdx, worst_idx: worstIdx,
                ab_values: abVector, aw_values: awVector
            });
            setResult(res.data);
        } catch (err) {
            alert('Perhitungan Gagal. Cek Konsistensi Input.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
                <strong>Skenario BWM:</strong> Ubah nilai perbandingan vektor untuk melihat perubahan bobot prioritas.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* INPUT */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Best ({criteria[bestIdx]}) vs Others:</label>
                        <div className="grid grid-cols-1 gap-2">
                            {criteria.map((c, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span className="text-sm">Best vs {c}</span>
                                    <input type="number" min="1" max="9" className="w-16 border-gray-300 rounded text-center text-sm"
                                        value={abVector[i]} disabled={i === bestIdx}
                                        onChange={(e) => { const n = [...abVector]; n[i] = parseInt(e.target.value); setAbVector(n); }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 mt-4">Others vs Worst ({criteria[worstIdx]}):</label>
                        <div className="grid grid-cols-1 gap-2">
                            {criteria.map((c, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span className="text-sm">{c} vs Worst</span>
                                    <input type="number" min="1" max="9" className="w-16 border-gray-300 rounded text-center text-sm"
                                        value={awVector[i]} disabled={i === worstIdx}
                                        onChange={(e) => { const n = [...awVector]; n[i] = parseInt(e.target.value); setAwVector(n); }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <PrimaryButton onClick={handleCalculate} className="w-full justify-center mt-4">Hitung Bobot</PrimaryButton>
                </div>

                {/* OUTPUT */}
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-auto">
                    <h3 className="font-bold text-white border-b border-gray-700 pb-2 mb-4">Hasil BWM</h3>
                    {!result ? <p className="text-gray-500">// Menunggu eksekusi...</p> : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-400"># Bobot Optimal (w*):</p>
                                {Object.entries(result.weights_dict).map(([k, v]: any) => (
                                    <div key={k} className="flex justify-between"><span>{k}:</span><span className="font-bold text-white">{v}</span></div>
                                ))}
                            </div>
                            <div className="border-t border-gray-700 pt-2">
                                <p>Xi = {result.xi}</p>
                                <p>CR = {result.cr} {result.cr <= 0.1 ? '(Konsisten)' : '(Tidak Konsisten)'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENT 2: MOORA SIMULATION (STANDALONE)
// ============================================================================
function MOORASimulation() {
    const [alternatives] = useState(['Siswa A', 'Siswa B', 'Siswa C']);
    const [criteria] = useState(['C1', 'C2', 'C3', 'C4']);
    const [types] = useState(['benefit', 'cost', 'benefit', 'benefit']);
    const [weights, setWeights] = useState([0.25, 0.15, 0.40, 0.20]);
    const [matrix, setMatrix] = useState([[80, 5000000, 4, 3], [90, 2000000, 5, 5], [75, 8000000, 3, 2]]);
    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const res = await apiClient.post('/simulation/moora', { alternatives, criteria, matrix, weights, types });
            setResult(res.data);
        } catch (err) { alert('Gagal Hitung MOORA'); }
    };

    const updateMatrix = (r: number, c: number, val: string) => {
        const newM = [...matrix]; newM[r][c] = parseFloat(val); setMatrix(newM);
    };

    return (
        <div className="space-y-8">
            <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800">
                <strong>Skenario MOORA:</strong> Ubah nilai matriks atau bobot manual untuk melihat perubahan ranking.
            </div>
            <div>
                <h3 className="font-bold text-gray-800 mb-4">Input Matriks & Bobot Manual</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left">Alt</th>
                                {criteria.map((c, i) => (
                                    <th key={i} className="p-3 text-center">
                                        {c} ({types[i]})<br/>
                                        <input type="number" className="w-16 text-center text-xs mt-1 border-gray-300 rounded"
                                            value={weights[i]} onChange={(e) => { const nw = [...weights]; nw[i] = parseFloat(e.target.value); setWeights(nw); }} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {alternatives.map((alt, r) => (
                                <tr key={r}>
                                    <td className="p-3 font-medium">{alt}</td>
                                    {criteria.map((_, c) => (
                                        <td key={c} className="p-2 text-center">
                                            <input type="number" className="w-full border-gray-300 rounded text-center"
                                                value={matrix[r][c]} onChange={(e) => updateMatrix(r, c, e.target.value)} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex justify-end"><PrimaryButton onClick={handleCalculate}>Proses MOORA</PrimaryButton></div>
            </div>
            {result && (
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-800">Hasil Perankingan</h3>
                    <div className="grid gap-3">
                        {result.ranking.map((item: any) => (
                            <div key={item.rank} className="bg-white border rounded p-3 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">#{item.rank}</span>
                                    <span className="font-bold">{item.name}</span>
                                </div>
                                <span className="text-xl font-bold text-indigo-700">{item.score.toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// COMPONENT 3: INTEGRATED SIMULATION (FULL FLOW)
// ============================================================================
function IntegratedSimulation() {
    // --- STATE BWM ---
    const [criteria] = useState(['Akademik', 'Ekonomi', 'Minat', 'Psikotest']);
    const [bestIdx] = useState(2); // Minat
    const [worstIdx] = useState(1); // Ekonomi
    const [abVector, setAbVector] = useState([3, 8, 1, 2]);
    const [awVector, setAwVector] = useState([4, 1, 8, 5]);

    // --- STATE MOORA ---
    const [alternatives] = useState(['Siswa A', 'Siswa B', 'Siswa C']);
    const [types, setTypes] = useState(['benefit', 'cost', 'benefit', 'benefit']);
    const [matrix, setMatrix] = useState([
        [85, 5000000, 5, 80],
        [90, 1500000, 4, 85],
        [75, 8000000, 3, 70]
    ]);

    const [result, setResult] = useState<any>(null);

    const handleCalculate = async () => {
        try {
            const res = await apiClient.post('/simulation/integrated', {
                criteria, best_idx: bestIdx, worst_idx: worstIdx, ab_values: abVector, aw_values: awVector,
                alternatives, matrix, types
            });
            setResult(res.data);
        } catch (err) {
            alert('Perhitungan Gagal. Cek data input.');
        }
    };

    const updateMatrix = (r: number, c: number, val: string) => {
        const newM = [...matrix]; newM[r][c] = parseFloat(val); setMatrix(newM);
    };

    return (
        <div className="space-y-8">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-800 text-lg mb-2">Simulasi Alur Penuh (End-to-End)</h3>
                <p className="text-sm text-purple-700">
                    Pada menu ini, Bobot Kriteria <strong>tidak diinput manual</strong>, melainkan dihasilkan dari perhitungan BWM (Tahap 1) dan langsung diteruskan ke matriks MOORA (Tahap 2).
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- KOLOM KIRI: INPUT DATA --- */}
                <div className="space-y-6 border-r pr-6">

                    {/* INPUT TAHAP 1: BWM */}
                    <div className="bg-gray-50 p-4 rounded border">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded mb-2 inline-block">TAHAP 1</span>
                        <h4 className="font-bold text-gray-700 mb-4">Preferensi Pakar (BWM)</h4>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Best Criterion: <strong>{criteria[bestIdx]}</strong></span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500">Perbandingan Best ({criteria[bestIdx]}) ke Others:</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {criteria.map((c, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <span className="text-[10px]">{c}</span>
                                            <input type="number" min="1" max="9" className="w-full text-center border-gray-300 rounded text-xs"
                                                value={abVector[i]} disabled={i === bestIdx}
                                                onChange={e => {const n=[...abVector]; n[i]=parseInt(e.target.value); setAbVector(n)}} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1 mt-2">
                                <p className="text-xs text-gray-500">Perbandingan Others ke Worst ({criteria[worstIdx]}):</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {criteria.map((c, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <span className="text-[10px]">{c}</span>
                                            <input type="number" min="1" max="9" className="w-full text-center border-gray-300 rounded text-xs"
                                                value={awVector[i]} disabled={i === worstIdx}
                                                onChange={e => {const n=[...awVector]; n[i]=parseInt(e.target.value); setAwVector(n)}} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* INPUT TAHAP 2: MOORA */}
                    <div className="bg-gray-50 p-4 rounded border">
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded mb-2 inline-block">TAHAP 2</span>
                        <h4 className="font-bold text-gray-700 mb-4">Data Nilai Siswa (MOORA)</h4>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th></th>
                                        {criteria.map((c, i) => (
                                            <th key={i} className="p-1 text-center text-xs text-gray-500">
                                                {c} <br/>
                                                <select
                                                    className="text-[10px] border-none bg-transparent p-0 focus:ring-0 cursor-pointer text-gray-400 font-bold uppercase"
                                                    value={types[i]}
                                                    onChange={e => {const t=[...types]; t[i]=e.target.value; setTypes(t)}}
                                                >
                                                    <option value="benefit">Benefit</option>
                                                    <option value="cost">Cost</option>
                                                </select>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {alternatives.map((alt, r) => (
                                        <tr key={r}>
                                            <td className="font-medium pr-2 text-xs">{alt}</td>
                                            {criteria.map((_, c) => (
                                                <td key={c} className="p-1">
                                                    <input type="number" className="w-full text-center border-gray-300 rounded text-xs p-1"
                                                        value={matrix[r][c]}
                                                        onChange={e => updateMatrix(r, c, e.target.value)} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <PrimaryButton onClick={handleCalculate} className="w-full justify-center h-12 text-lg shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600">
                        Jalankan Simulasi Terintegrasi
                    </PrimaryButton>
                </div>

                {/* --- KOLOM KANAN: HASIL --- */}
                <div className="space-y-6">
                    {!result ? (
                        <div className="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 rounded border border-dashed">
                            Hasil perhitungan akan muncul di sini...
                        </div>
                    ) : (
                        <>
                            {/* HASIL 1: BOBOT BWM */}
                            <div className="bg-white border rounded-lg shadow-sm p-4 animate-fade-in-up">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Hasil Bobot (Output BWM)
                                </h4>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {Object.entries(result.bwm_result.weights_dict).map(([k, v]: any) => (
                                        <div key={k} className="bg-indigo-50 p-2 rounded border border-indigo-100">
                                            <div className="text-xs text-gray-500">{k}</div>
                                            <div className="font-bold text-indigo-700 text-lg">{v}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-right text-xs text-gray-400">
                                    Konsistensi (CR): {result.bwm_result.cr}
                                </div>
                            </div>

                            {/* ARROW CONNECTOR */}
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-bold border border-white">
                                    &darr; Bobot diteruskan ke MOORA &darr;
                                </div>
                            </div>

                            {/* HASIL 2: RANKING MOORA */}
                            <div className="bg-white border rounded-lg shadow-sm p-4 animate-fade-in-up">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Hasil Perankingan (Output MOORA)
                                </h4>
                                <div className="space-y-3">
                                    {result.moora_result.ranking.map((item: any) => (
                                        <div key={item.rank} className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-emerald-500">
                                            <div className="flex items-center gap-3">
                                                <div className="font-bold text-2xl text-gray-300">#{item.rank}</div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{item.name}</div>
                                                    <div className="text-[10px] text-gray-500">
                                                        Benefit: <span className="text-green-600">{item.detail.benefit_parts.length} items</span> |
                                                        Cost: <span className="text-red-600">{item.detail.cost_parts.length} items</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 uppercase">Nilai Yi</div>
                                                <div className="font-bold text-xl text-emerald-700">{item.score.toFixed(4)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}