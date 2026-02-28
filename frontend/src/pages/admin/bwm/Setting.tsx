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

    // State Calculation & Results
    const [statusData, setStatusData] = useState<any>(null);
    const [savedResults, setSavedResults] = useState<any[]>([]); // Menyimpan array hasil per jurusan
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

    const fetchResults = async () => {
        try {
            const res = await apiClient.get('/bwm/admin/results');
            setSavedResults(res.data.hasil || []);
        } catch (error) {
            console.error("Gagal mengambil hasil:", error);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await apiClient.get('/bwm/admin/status');
            setStatusData(res.data);
            
            // Jika status mendeteksi sudah ada bobot di DB, panggil fetchResults agar data tidak hilang saat direfresh
            if (res.data.has_existing_weights) {
                fetchResults();
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
            
            // Menampilkan pesan sukses dari backend
            Swal.fire({
                title: 'Perhitungan Selesai',
                text: res.data.msg,
                icon: 'success'
            });
            
            // Refresh status dan fetch ulang tabel hasilnya
            fetchStatus(); 
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

                    {/* CONTENT: CONFIG (Tetap sama) */}
                    {activeTab === 'config' && (
                        <div className="bg-white overflow-hidden shadow sm:rounded-b-lg p-8">
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
                                                <select value={bestId} onChange={(e) => setBestId(e.target.value)} className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md shadow-sm" required>
                                                    <option value="">-- Pilih --</option>
                                                    {kriterias.map((k: any) => (
                                                        <option key={k.id} value={k.id} disabled={String(k.id) === worstId}>{k.kode} - {k.nama}</option>
                                                    ))}
                                                </select>
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
                                                <select value={worstId} onChange={(e) => setWorstId(e.target.value)} className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm rounded-md shadow-sm" required>
                                                    <option value="">-- Pilih --</option>
                                                    {kriterias.map((k: any) => (
                                                        <option key={k.id} value={k.id} disabled={String(k.id) === bestId}>{k.kode} - {k.nama}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative py-8">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300"></div></div>
                                </div>

                                <div className="flex justify-center">
                                    <button type="submit" disabled={loadingConfig} className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50">
                                        Simpan & Kunci Hasil FGD
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* CONTENT: VALIDATION & CALCULATION */}
                    {activeTab === 'calculate' && statusData && (
                        <div className="space-y-6">
                            
                            {/* STATUS CARD (Tetap sama) */}
                            <div className={`p-6 rounded-lg border shadow-sm ${statusData.ready ? 'bg-white border-l-4 border-gray-300 border-l-green-500' : 'bg-white border-l-4 border-gray-300 border-l-rose-500'}`}>
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
                                                    ? "Minimal Guru BK dan 1 Kaprodi telah selesai mengisi. Anda dapat menjalankan kalkulasi."
                                                    : "Terdapat beberapa kriteria yang belum dinilai. Mohon lengkapi sebelum menghitung."}
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
                                    <ul className="divide-y divide-gray-200">
                                        {statusData.missing_items.map((item: any, idx: number) => (
                                            <li key={idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">{item.kode}</span>
                                                            <span className="text-sm text-gray-600">{item.nama}</span>
                                                        </div>
                                                        <div className="mt-2">
                                                            {item.missing.map((m: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 mr-2 border border-rose-200">Missing: {m}</span>
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
                                    <h4 className="font-bold text-indigo-900">Eksekusi Solver BWM (Per Jurusan)</h4>
                                    <p className="text-sm text-indigo-700 mt-1">
                                        Sistem akan menyatukan vektor bobot global (Guru BK) dengan bobot teknis (Kaprodi) untuk masing-masing jurusan.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCalculate}
                                    disabled={!statusData.ready || loadingCalc}
                                    className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold uppercase tracking-wide rounded-md shadow-lg text-white transition-all
                                        ${!statusData.ready ? 'bg-gray-400 cursor-not-allowed grayscale' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5'}`}
                                >
                                    {loadingCalc ? 'Memproses...' : 'Hitung Bobot Final'}
                                </button>
                            </div>

                            {/* TAMPILAN HASIL (LOOPING PER JURUSAN) */}
                            {savedResults.length > 0 && (
                                <div className="mt-8 space-y-6">
                                    <h3 className="text-xl leading-6 font-bold text-gray-900 border-b border-gray-300 pb-2">Hasil Bobot Per Jurusan</h3>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {savedResults.map((item, idx) => (
                                            <div key={idx} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center">
                                                    <h4 className="font-bold text-indigo-700">{item.jurusan}</h4>
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                                                        Tersimpan
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-white">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Kode</th>
                                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kriteria</th>
                                                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Persentase</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-100">
                                                            {Object.entries(item.weights || {}).map(([kode, val]: any, i) => (
                                                                <tr key={kode} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-600">{kode}</td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                        {kriterias.find((k:any) => k.kode === kode)?.nama || '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                                                                        {(val * 100).toFixed(2)}%
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
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