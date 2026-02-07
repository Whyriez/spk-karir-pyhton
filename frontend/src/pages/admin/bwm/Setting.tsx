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
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('config')}
                                className={`${
                                    activeTab === 'config'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === 'config' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}>1</span>
                                Konfigurasi FGD
                            </button>
                            <button
                                onClick={() => setActiveTab('calculate')}
                                className={`${
                                    activeTab === 'calculate'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === 'calculate' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}>2</span>
                                Validasi & Finalisasi
                            </button>
                        </nav>
                    </div>

                    {/* CONTENT: CONFIG */}
                    {activeTab === 'config' && (
                        <div className="bg-white overflow-hidden shadow sm:rounded-b-lg p-8">
                            
                            {/* Header Section */}
                            <div className="mb-8 text-center max-w-2xl mx-auto">
                                <h3 className="text-2xl font-bold text-gray-900">Hasil Forum Group Discussion (FGD)</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    Tentukan kriteria acuan <strong>BEST</strong> (Paling Penting) dan <strong>WORST</strong> (Paling Tidak Penting) berdasarkan kesepakatan rapat dewan guru.
                                </p>
                            </div>

                            <form onSubmit={handleSaveConfig} className="max-w-5xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                    
                                    {/* CARD BEST */}
                                    <div className={`relative rounded-xl border-2 p-6 transition-all duration-200 ${bestId ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>
                                        <div className="absolute -top-4 left-6 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200 shadow-sm">
                                            Kriteria Terbaik (Best)
                                        </div>
                                        <div className="mt-4 flex items-start gap-4">
                                            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kriteria Paling Dominan</label>
                                                <select 
                                                    value={bestId} 
                                                    onChange={(e) => setBestId(e.target.value)}
                                                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md shadow-sm"
                                                    required
                                                >
                                                    <option value="">-- Pilih --</option>
                                                    {kriterias.map((k: any) => (
                                                        <option key={k.id} value={k.id} disabled={String(k.id) === worstId}>
                                                            {k.kode} - {k.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-2 text-xs text-emerald-600">
                                                    Kriteria ini akan memiliki bobot tertinggi dalam sistem.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CARD WORST */}
                                    <div className={`relative rounded-xl border-2 p-6 transition-all duration-200 ${worstId ? 'border-rose-500 bg-rose-50/30' : 'border-gray-200 bg-white'}`}>
                                        <div className="absolute -top-4 left-6 bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-200 shadow-sm">
                                            Kriteria Terburuk (Worst)
                                        </div>
                                        <div className="mt-4 flex items-start gap-4">
                                            <div className="p-3 bg-rose-100 rounded-lg text-rose-600">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kriteria Paling Lemah</label>
                                                <select 
                                                    value={worstId} 
                                                    onChange={(e) => setWorstId(e.target.value)}
                                                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm rounded-md shadow-sm"
                                                    required
                                                >
                                                    <option value="">-- Pilih --</option>
                                                    {kriterias.map((k: any) => (
                                                        <option key={k.id} value={k.id} disabled={String(k.id) === bestId}>
                                                            {k.kode} - {k.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-2 text-xs text-rose-600">
                                                    Kriteria ini akan memiliki bobot terendah dalam sistem.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider with Icon */}
                                <div className="relative py-8">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="px-3 bg-white text-gray-400">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button 
                                        type="submit" 
                                        disabled={loadingConfig}
                                        className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                    >
                                        {loadingConfig ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                                Simpan & Kunci Hasil FGD
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* CONTENT: VALIDATION & CALCULATION */}
                    {activeTab === 'calculate' && statusData && (
                        <div className="space-y-6">
                            
                            {/* STATUS CARD */}
                            <div className={`p-6 rounded-lg border shadow-sm ${statusData.ready ? 'bg-white border-l-4 border-l-green-500' : 'bg-white border-l-4 border-l-rose-500'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${statusData.ready ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {statusData.ready ? (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${statusData.ready ? 'text-gray-900' : 'text-gray-900'}`}>
                                                Status: {statusData.ready ? 'Siap Finalisasi' : 'Data Belum Lengkap'}
                                            </h3>
                                            <p className="text-sm mt-1 text-gray-600 max-w-2xl">
                                                {statusData.ready 
                                                    ? "Seluruh pakar telah menyelesaikan input perbandingan. Sistem siap melakukan kalkulasi bobot final (Global Weights)."
                                                    : "Terdapat beberapa kriteria yang belum dinilai oleh pakar yang bersangkutan. Mohon lengkapi sebelum menghitung."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <span className="block text-3xl font-bold text-indigo-600">{statusData.total_input}</span>
                                        <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Input Masuk</span>
                                    </div>
                                </div>
                            </div>

                            {/* LIST MISSING ITEMS */}
                            {!statusData.ready && (
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                                    <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Detail Kekurangan Data</h3>
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">Action Required</span>
                                    </div>
                                    <ul className="divide-y divide-gray-200">
                                        {statusData.missing_items.map((item: any, idx: number) => (
                                            <li key={idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">
                                                                {item.kode}
                                                            </span>
                                                            <span className="text-sm text-gray-600">
                                                                {item.nama}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2">
                                                            {item.missing.map((m: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 mr-2 border border-rose-200">
                                                                    Missing: {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-gray-400 mr-2 uppercase font-semibold">Penanggung Jawab:</span>
                                                        {renderOwnerBadge(item.penanggung_jawab)}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* ACTION BUTTON */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-sm sm:rounded-lg border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-indigo-900">Eksekusi Solver BWM</h4>
                                    <p className="text-sm text-indigo-700 mt-1">
                                        Sistem akan menggabungkan inputan multi-pakar, menjalankan algoritma optimasi, dan menghasilkan bobot prioritas.
                                    </p>
                                    {statusData.has_existing_weights && (
                                        <div className="mt-2 flex items-center text-xs text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded w-fit">
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Perhatian: Bobot lama akan ditimpa.
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleCalculate}
                                    disabled={!statusData.ready || loadingCalc}
                                    className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold uppercase tracking-wide rounded-md shadow-lg text-white transition-all
                                        ${!statusData.ready ? 'bg-gray-400 cursor-not-allowed grayscale' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5'}`}
                                >
                                    {loadingCalc ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            Hitung Final
                                            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* CALCULATION RESULTS */}
                            {calcResult && (
                                <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200 mt-8 relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                    <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                                        <div>
                                            <h3 className="text-xl leading-6 font-bold text-gray-900">Hasil Pembobotan (Global Weights)</h3>
                                            <p className="text-sm text-gray-500 mt-1">Nilai prioritas final untuk setiap kriteria.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-600">Konsistensi (CR):</span>
                                            <div className={`px-3 py-1 rounded-full flex items-center gap-2 border ${calcResult.cr <= 0.1 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                <span className="font-mono font-bold text-sm">{calcResult.cr?.toFixed(4)}</span>
                                                {calcResult.cr <= 0.1 ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Kode</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kriteria</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bobot (Desimal)</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bobot (%)</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Visual</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {Object.entries(calcResult.weights || {}).map(([kode, val]: [string, any], idx) => (
                                                        <tr key={kode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{kode}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                                {/* Mencari nama kriteria dari state config */}
                                                                {kriterias.find((k:any) => k.kode === kode)?.nama || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{val.toFixed(4)}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{(val * 100).toFixed(2)}%</td>
                                                            <td className="px-6 py-4 whitespace-nowrap align-middle w-1/4">
                                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${val * 100}%` }}></div>
                                                                </div>
                                                            </td>
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