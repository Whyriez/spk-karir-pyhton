import React, { useEffect, useState, useMemo } from 'react';
import apiClient from "@/lib/axios";
import Header from "../../../components/Header.tsx";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// --- KONFIGURASI SWEETALERT ---
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

interface Kriteria {
    id: number;
    kode: string;
    nama: string;
}

export default function BwmInput() {
    // Context Data
    const [globalBest, setGlobalBest] = useState<Kriteria | null>(null);
    const [globalWorst, setGlobalWorst] = useState<Kriteria | null>(null);
    const [criteriaList, setCriteriaList] = useState<Kriteria[]>([]);
    const [userRole, setUserRole] = useState('');
    const [isReady, setIsReady] = useState(false);

    // Form Data
    const [bestToOthers, setBestToOthers] = useState<Record<string, number>>({});
    const [othersToWorst, setOthersToWorst] = useState<Record<string, number>>({});
    const [processing, setProcessing] = useState(false);

    // Consistency Ratio State
    const [crValue, setCrValue] = useState<number | null>(null);

    // Fetch Initial Data
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const res = await apiClient.get('/bwm/input-context');

                if (res.data.ready) {
                    setGlobalBest(res.data.global_best);
                    setGlobalWorst(res.data.global_worst);
                    setCriteriaList(res.data.kriteria_list);
                    setUserRole(res.data.user_role);

                    setBestToOthers(res.data.saved_best_to_others || {});
                    setOthersToWorst(res.data.saved_others_to_worst || {});

                    setIsReady(true);
                } else {
                    MySwal.fire({
                        icon: 'warning',
                        title: 'Belum Siap',
                        text: res.data.msg || 'Konfigurasi admin belum lengkap.'
                    });
                }
            } catch (err) {
                console.error(err);
                Toast.fire({ icon: 'error', title: 'Gagal memuat data BWM.' });
            }
        };
        fetchContext();
    }, []);

    // Effect untuk Realtime CR Calculation
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Hanya hitung jika sudah ada inputan
            if (Object.keys(bestToOthers).length === 0 && Object.keys(othersToWorst).length === 0) return;

            try {
                const res = await apiClient.post('/bwm/calculate', {
                    best_to_others: bestToOthers,
                    others_to_worst: othersToWorst
                });
                if (res.status === 200) {
                    setCrValue(res.data.cr);
                }
            } catch (err) {
                console.error("Error calculating CR:", err);
            }
        }, 800); // Debounce 800ms

        return () => clearTimeout(timer);
    }, [bestToOthers, othersToWorst]);

    // --- LOGIKA SORTING (NATURAL SORT) ---
    const sortedKriteriaList = useMemo(() => {
        return [...criteriaList].sort((a, b) => {
            const numA = parseInt(a.kode.replace(/\D/g, '') || '0');
            const numB = parseInt(b.kode.replace(/\D/g, '') || '0');
            return numA - numB;
        });
    }, [criteriaList]);

    // --- VALIDASI FORM ---
    const validateForm = () => {
        if (!globalBest || !globalWorst) return "Data referensi Best/Worst tidak ditemukan.";

        // 1. Cek Kelengkapan Best-to-Others
        const missingBest = criteriaList
            .filter(k => k.id !== globalBest.id)
            .filter(k => !bestToOthers[k.id]);

        if (missingBest.length > 0) {
            return "Mohon lengkapi semua perbandingan di bagian 'Best-to-Others'.";
        }

        // 2. Cek Kelengkapan Others-to-Worst
        const missingWorst = criteriaList
            .filter(k => k.id !== globalWorst.id)
            .filter(k => !othersToWorst[k.id]);

        if (missingWorst.length > 0) {
            return "Mohon lengkapi semua perbandingan di bagian 'Others-to-Worst'.";
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validasi Input
        const errorMsg = validateForm();
        if (errorMsg) {
            MySwal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: errorMsg });
            return;
        }

        // 2. Cek Konsistensi (Optional Warning)
        if (crValue !== null && crValue > 0.1) {
            await MySwal.fire({
                icon: 'error', // Icon error untuk menandakan tidak bisa lanjut
                title: 'Konsistensi Tidak Valid',
                html: `Nilai CR Anda adalah <b>${crValue.toFixed(4)}</b> (> 0.1).<br/>Sistem mensyaratkan nilai CR harus ≤ 0.1 (Konsisten).<br/>Silakan perbaiki penilaian Anda.`,
                confirmButtonText: 'Perbaiki Dulu', // Hanya satu tombol
                confirmButtonColor: '#3085d6',
                showCancelButton: false, // Hilangkan tombol cancel/lanjut
                allowOutsideClick: false
            });
            return; // STOP: Jangan lanjut ke proses penyimpanan
        }

        setProcessing(true);
        try {
            await apiClient.post('/bwm/save', {
                best_to_others: bestToOthers,
                others_to_worst: othersToWorst
            });

            MySwal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Bobot penilaian berhasil disimpan.',
                timer: 3000,
                showConfirmButton: false
            });

        } catch (e: any) {
            const msg = e.response?.data?.msg || "Terjadi kesalahan koneksi.";
            MySwal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setProcessing(false);
        }
    };

    const handleComparisonChange = (type: "best" | "others", targetId: number, value: string) => {
        const valInt = parseInt(value);
        if (type === "best") {
            setBestToOthers(prev => ({...prev, [targetId]: valInt}));
        } else {
            setOthersToWorst(prev => ({...prev, [targetId]: valInt}));
        }
    };

    const scaleOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    if (!isReady) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-500 text-sm">Menyiapkan Kuesioner BWM...</p>
            </div>
        );
    }

    return (
        <>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800">Input BWM (Sesuai FGD)</h2>
            </Header>
            <div className="py-12 px-3">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* INFO ROLE */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 shadow-sm rounded-r-md">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    Login sebagai: <strong>{userRole === 'gurubk' ? 'Guru BK' : 'Kaprodi'}</strong>. <br/>
                                    Silakan isi perbandingan di bawah ini sesuai kesepakatan FGD.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`sticky top-20 z-30 shadow-lg p-4 mb-8 rounded-xl border flex flex-col md:flex-row justify-between items-center transition-all duration-500 backdrop-blur-md ${
                        crValue === null ? 'bg-white/95 border-gray-200' :
                        crValue <= 0.1 ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 
                        'bg-amber-50/95 border-amber-200 text-amber-800'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${crValue !== null && crValue <= 0.1 ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-bold block text-sm opacity-70">Consistency Ratio (CR)</span>
                                <span className="text-2xl font-mono font-bold tracking-tight">
                                    {crValue !== null ? crValue.toFixed(4) : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="text-right mt-2 md:mt-0">
                            {crValue === null && <span className="text-sm text-gray-500 italic">Isi perbandingan untuk melihat CR...</span>}
                            {crValue !== null && crValue > 0.1 && (
                                 <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-white border border-amber-200 text-amber-800 shadow-sm animate-pulse">
                                     ⚠️ Tidak Konsisten (Target &le; 0.1)
                                 </span>
                            )}
                            {crValue !== null && crValue <= 0.1 && (
                                 <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-sm">
                                     ✅ Konsisten (Baik)
                                 </span>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* --- TAMPILAN STATIS BEST & WORST --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            {/* Connector (Desktop Only) */}
                            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>

                            {/* KOTAK BEST */}
                            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-200 text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-green-100 rounded-full opacity-50 blur-xl"></div>
                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest border border-green-200 px-2 py-0.5 rounded-full bg-white">
                                    Reference Best (FGD)
                                </span>
                                <div className="text-3xl font-extrabold text-green-800 mt-3 mb-1">
                                    {globalBest?.nama}
                                </div>
                                <div className="text-xs text-green-600 font-mono bg-green-50 inline-block px-2 py-0.5 rounded">
                                    Kode: {globalBest?.kode}
                                </div>
                            </div>

                            {/* KOTAK WORST */}
                            <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border border-red-200 text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-red-100 rounded-full opacity-50 blur-xl"></div>
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest border border-red-200 px-2 py-0.5 rounded-full bg-white">
                                    Reference Worst (FGD)
                                </span>
                                <div className="text-3xl font-extrabold text-red-800 mt-3 mb-1">
                                    {globalWorst?.nama}
                                </div>
                                <div className="text-xs text-red-600 font-mono bg-red-50 inline-block px-2 py-0.5 rounded">
                                    Kode: {globalWorst?.kode}
                                </div>
                            </div>
                        </div>

                        {/* --- FORM PERBANDINGAN --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* 1. BEST VS LAINNYA */}
                            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
                                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
                                    <h3 className="font-bold text-indigo-900 text-lg">Perbandingan Best-to-Others</h3>
                                    <p className="text-xs text-indigo-600 mt-1">
                                        Nilai 1 (Sama) s/d 9 (Mutlak Lebih Penting)
                                    </p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {sortedKriteriaList.map((k) => {
                                        if (k.id === globalBest?.id) return null;
                                        const isWorst = k.id === globalWorst?.id;

                                        return (
                                            <div key={k.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isWorst ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">
                                                        BEST ➔ {k.nama} <span className="text-xs font-mono text-gray-400 font-normal">({k.kode})</span>
                                                    </span>
                                                    {isWorst && <span className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5 tracking-wide">Target ke Worst</span>}
                                                </div>
                                                <select
                                                    className={`w-20 text-center border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 font-bold ${!bestToOthers[k.id] ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                                                    onChange={(e) => handleComparisonChange("best", k.id, e.target.value)}
                                                    value={bestToOthers[k.id] || ""}
                                                    required
                                                >
                                                    <option value="">-</option>
                                                    {scaleOptions.map((val) => (
                                                        <option key={val} value={val}>{val}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. LAINNYA VS WORST */}
                            <div className="bg-white rounded-xl shadow-sm border border-rose-100 overflow-hidden">
                                <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
                                    <h3 className="font-bold text-rose-900 text-lg">Perbandingan Others-to-Worst</h3>
                                    <p className="text-xs text-rose-600 mt-1">
                                        Nilai 1 (Sama) s/d 9 (Mutlak Lebih Penting)
                                    </p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {sortedKriteriaList.map((k) => {
                                        if (k.id === globalWorst?.id) return null;

                                        return (
                                            <div key={k.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-rose-200 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">
                                                        {k.nama} <span className="text-xs font-mono text-gray-400 font-normal">({k.kode})</span> ➔ WORST
                                                    </span>
                                                </div>
                                                <select
                                                    className={`w-20 text-center border-gray-300 rounded-md shadow-sm text-sm focus:ring-rose-500 font-bold ${!othersToWorst[k.id] ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                                                    onChange={(e) => handleComparisonChange("others", k.id, e.target.value)}
                                                    value={othersToWorst[k.id] || ""}
                                                    required
                                                >
                                                    <option value="">-</option>
                                                    {scaleOptions.map((val) => (
                                                        <option key={val} value={val}>{val}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* TOMBOL SUBMIT */}
                        <div className="flex justify-end pt-6 border-t border-gray-100 pb-12">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center px-8 py-3 bg-gray-900 border border-transparent rounded-lg font-bold text-sm text-white uppercase tracking-widest hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Menyimpan...
                                    </>
                                ) : "Simpan Bobot Penilaian"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
}