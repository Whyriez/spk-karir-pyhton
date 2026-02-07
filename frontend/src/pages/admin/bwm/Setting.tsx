import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import apiClient from '@/lib/axios';
import Swal from 'sweetalert2';

export default function AdminBwmSetting() {
    const [activeTab, setActiveTab] = useState<'config' | 'calculate'>('config');

    // State Config
    const [kriterias, setKriterias] = useState<any[]>([]);
    const [bestId, setBestId] = useState<string>('');
    const [worstId, setWorstId] = useState<string>('');
    const [loadingConfig, setLoadingConfig] = useState(false);

    // State Calculation
    const [statusData, setStatusData] = useState<any>(null);
    const [calcResult, setCalcResult] = useState<any>(null);
    const [loadingCalc, setLoadingCalc] = useState(false);

    // --- FETCH DATA ---
    const fetchConfig = async () => {
        try {
            const res = await apiClient.get('/bwm/admin/setting');
            setKriterias(res.data.kriterias);
            setBestId(res.data.current_best ? String(res.data.current_best) : '');
            setWorstId(res.data.current_worst ? String(res.data.current_worst) : '');
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await apiClient.get('/bwm/admin/status');
            setStatusData(res.data);
            if (res.data.ready) {
                // Jika ready, tidak ada salahnya kita clear result lama biar user klik hitung lagi
                // setCalcResult(null); 
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchConfig();
        if (activeTab === 'calculate') {
            fetchStatus();
        }
    }, [activeTab]);

    // --- HANDLERS CONFIG ---
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingConfig(true);
        try {
            await apiClient.post('/bwm/admin/setting', {
                best_id: bestId,
                worst_id: worstId
            });
            Swal.fire('Berhasil', 'Setting FGD berhasil disimpan. Silakan minta Pakar mengisi.', 'success');
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.msg || 'Gagal menyimpan', 'error');
        } finally {
            setLoadingConfig(false);
        }
    };

    // --- HANDLERS CALCULATION ---
    const handleCalculate = async () => {
        setLoadingCalc(true);
        try {
            const res = await apiClient.post('/bwm/admin/calculate-final');
            setCalcResult(res.data);
            
            let msg = res.data.msg;
            if (res.data.warning) msg += `\n\n${res.data.warning}`;
            
            Swal.fire({
                title: 'Perhitungan Selesai',
                text: msg,
                icon: res.data.warning ? 'warning' : 'success'
            });
            fetchStatus(); // Refresh status (e.g. update existing weights flag)
        } catch (error: any) {
            Swal.fire('Gagal', error.response?.data?.msg || 'Terjadi kesalahan server', 'error');
        } finally {
            setLoadingCalc(false);
        }
    };

    // --- RENDER HELPERS ---
    const renderOwnerBadge = (owner: string) => {
        if (owner === 'gurubk') return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded border border-blue-200">Guru BK</span>;
        if (owner === 'kaprodi') return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded border border-purple-200">Kaprodi</span>;
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">Umum</span>;
    };

    return (
        <div>
            <Header>Setting & Kalkulasi BWM</Header>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* TABS NAVIGATION */}
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('config')}
                                className={`${activeTab === 'config' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                1. Konfigurasi FGD
                            </button>
                            <button
                                onClick={() => setActiveTab('calculate')}
                                className={`${activeTab === 'calculate' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                2. Validasi & Finalisasi
                            </button>
                        </nav>
                    </div>

                    {/* CONTENT: CONFIG */}
                    {activeTab === 'config' && (
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Tentukan Referensi (Hasil FGD)</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Sebelum pakar melakukan input, Admin harus menentukan kriteria mana yang disepakati sebagai 
                                <b> BEST (Terbaik)</b> dan <b>WORST (Terburuk)</b>.
                            </p>

                            <form onSubmit={handleSaveConfig} className="max-w-xl space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kriteria BEST (Paling Penting)</label>
                                    <select 
                                        value={bestId} 
                                        onChange={(e) => setBestId(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        required
                                    >
                                        <option value="">-- Pilih Kriteria Best --</option>
                                        {kriterias.map((k: any) => (
                                            <option key={k.id} value={k.id} disabled={String(k.id) === worstId}>
                                                ({k.kode}) {k.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kriteria WORST (Paling Tidak Penting)</label>
                                    <select 
                                        value={worstId} 
                                        onChange={(e) => setWorstId(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        required
                                    >
                                        <option value="">-- Pilih Kriteria Worst --</option>
                                        {kriterias.map((k: any) => (
                                            <option key={k.id} value={k.id} disabled={String(k.id) === bestId}>
                                                ({k.kode}) {k.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loadingConfig}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                                >
                                    {loadingConfig ? 'Menyimpan...' : 'Simpan & Kunci FGD'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* CONTENT: VALIDATION & CALCULATION */}
                    {activeTab === 'calculate' && statusData && (
                        <div className="space-y-6">
                            
                            {/* STATUS CARD */}
                            <div className={`p-6 rounded-lg border ${statusData.ready ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className={`text-lg font-bold ${statusData.ready ? 'text-green-800' : 'text-red-800'}`}>
                                            Status: {statusData.ready ? 'Siap Finalisasi' : 'Belum Lengkap'}
                                        </h3>
                                        <p className="text-sm mt-1 text-gray-600">
                                            {statusData.ready 
                                                ? "Semua kriteria telah dinilai oleh pakar yang bersangkutan. Anda dapat melakukan perhitungan final."
                                                : "Terdapat beberapa kriteria yang belum lengkap penilaiannya. Mohon hubungi pakar terkait."}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-gray-800">{statusData.total_input}</span>
                                        <span className="text-xs text-gray-500 uppercase">Data Masuk</span>
                                    </div>
                                </div>
                            </div>

                            {/* LIST MISSING ITEMS */}
                            {!statusData.ready && (
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                                    <div className="px-4 py-5 sm:px-6 bg-gray-50">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Daftar Kekurangan Data</h3>
                                    </div>
                                    <ul className="divide-y divide-gray-200">
                                        {statusData.missing_items.map((item: any, idx: number) => (
                                            <li key={idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-indigo-600 truncate">
                                                            {item.nama} ({item.kode})
                                                        </span>
                                                        <div className="mt-1">
                                                            {item.missing.map((m: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-2">
                                                                    Missing: {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="text-sm text-gray-500 mr-2">Penanggung Jawab:</span>
                                                        {renderOwnerBadge(item.penanggung_jawab)}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* ACTION BUTTON */}
                            <div className="bg-white p-6 shadow sm:rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Klik tombol di kanan untuk menggabungkan semua data, menghitung Solver BWM, dan menyimpan bobot final.
                                    </p>
                                    {statusData.has_existing_weights && (
                                        <span className="text-xs text-orange-600 font-bold mt-1 block">
                                            ⚠️ Peringatan: Data bobot sebelumnya akan ditimpa.
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleCalculate}
                                    disabled={!statusData.ready || loadingCalc}
                                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white 
                                        ${!statusData.ready ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {loadingCalc ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Menghitung...
                                        </>
                                    ) : "Hitung & Simpan Final"}
                                </button>
                            </div>

                            {/* CALCULATION RESULTS */}
                            {calcResult && (
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-indigo-100 mt-6">
                                    <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center bg-indigo-50">
                                        <h3 className="text-lg leading-6 font-bold text-indigo-900">Hasil Perhitungan Final</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Consistency Ratio (CR):</span>
                                            <span className={`px-2 py-1 rounded font-mono font-bold ${calcResult.cr <= 0.1 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                {calcResult.cr?.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Kriteria</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai Bobot</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persentase</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {Object.entries(calcResult.weights || {}).map(([kode, val]: [string, any]) => (
                                                        <tr key={kode}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kode}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{val.toFixed(4)}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(val * 100).toFixed(2)}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}