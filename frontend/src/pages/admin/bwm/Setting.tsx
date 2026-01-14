import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import apiClient from "@/lib/axios";
import Header from "@/components/Header"; // Pastikan path ini sesuai
import PrimaryButton from '@/components/PrimaryButton';
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

export default function BwmSetting() {
    // Data State
    const [kriterias, setKriterias] = useState<Kriteria[]>([]);
    const [bestId, setBestId] = useState<string>('');
    const [worstId, setWorstId] = useState<string>('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/bwm/admin/setting');
            setKriterias(res.data.kriterias);
            if (res.data.current_best) setBestId(String(res.data.current_best));
            if (res.data.current_worst) setWorstId(String(res.data.current_worst));
        } catch (err) {
            console.error(err);
            Toast.fire({icon: 'error', title: 'Gagal memuat konfigurasi.'});
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validasi Manual
        if (!bestId || !worstId) {
            MySwal.fire({
                icon: 'warning',
                title: 'Data Belum Lengkap',
                text: 'Harap pilih Kriteria Terbaik dan Terburuk terlebih dahulu.'
            });
            return;
        }

        if (bestId === worstId) {
            MySwal.fire({
                icon: 'error',
                title: 'Logika Salah',
                text: 'Kriteria Terbaik (Best) dan Terburuk (Worst) tidak boleh sama!',
                footer: 'Silakan pilih kriteria yang berbeda.'
            });
            return;
        }

        // Konfirmasi Simpan
        MySwal.fire({
            title: 'Kunci Hasil FGD?',
            text: "Perubahan ini akan mereset form kuesioner Pakar. Pastikan hasil FGD sudah final.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1f2937', // Dark gray
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Simpan & Kunci',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                setProcessing(true);
                try {
                    await apiClient.post('/bwm/admin/setting', {
                        best_id: bestId,
                        worst_id: worstId
                    });

                    Toast.fire({icon: 'success', title: 'Konfigurasi FGD berhasil disimpan!'});
                } catch (err: any) {
                    const msg = err.response?.data?.msg || 'Terjadi kesalahan saat menyimpan.';
                    MySwal.fire({icon: 'error', title: 'Gagal', text: msg});
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    // Helper untuk preview nama kriteria
    const getKriteriaName = (id: string) => {
        const item = kriterias.find(k => String(k.id) === id);
        return item ? `(${item.kode}) ${item.nama}` : '...';
    };

    return (
        <div>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Konfigurasi BWM (Hasil FGD)</h2>
            </Header>

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="p-6">

                            {/* Instruksi Box */}
                            <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd"
                                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                  clipRule="evenodd"/>
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-medium text-amber-800">Instruksi Admin</h3>
                                        <p className="text-sm text-amber-700 mt-2">
                                            Halaman ini digunakan untuk menginput hasil kesepakatan <strong>FGD (Focus
                                            Group Discussion)</strong>.
                                            <br/>
                                            Kriteria yang Anda pilih di sini akan menjadi <strong>referensi
                                            terkunci</strong> bagi seluruh Pakar (Guru BK & Kaprodi) saat melakukan
                                            pembobotan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Memuat data kriteria...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">

                                        {/* Connector Icon (Desktop Only) */}
                                        <div
                                            className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
                                            <div
                                                className="bg-white p-2 rounded-full shadow-sm border border-gray-200 z-10">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24"
                                                     stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                                                </svg>
                                            </div>
                                        </div>

                                        {/* PILIH BEST */}
                                        <div
                                            className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm transition hover:shadow-md">
                                            <label
                                                className="block text-lg font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                                <span>🏆</span> Kriteria Terbaik (Best)
                                            </label>
                                            <p className="text-sm text-emerald-600 mb-4 h-10">
                                                Pilih kriteria yang disepakati sebagai yang <strong>paling
                                                penting</strong> / prioritas utama.
                                            </p>
                                            <select
                                                className="w-full border-emerald-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-base"
                                                value={bestId}
                                                onChange={(e) => setBestId(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Pilih Kriteria --</option>
                                                {kriterias.map((k) => (
                                                    <option key={k.id} value={k.id} disabled={String(k.id) === worstId}>
                                                        ({k.kode}) {k.nama}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* PILIH WORST */}
                                        <div
                                            className="bg-rose-50 p-6 rounded-xl border border-rose-100 shadow-sm transition hover:shadow-md">
                                            <label
                                                className="block text-lg font-bold text-rose-800 mb-2 flex items-center gap-2">
                                                <span>🔻</span> Kriteria Terburuk (Worst)
                                            </label>
                                            <p className="text-sm text-rose-600 mb-4 h-10">
                                                Pilih kriteria yang disepakati sebagai yang <strong>paling kurang
                                                penting</strong> dibanding lainnya.
                                            </p>
                                            <select
                                                className="w-full border-rose-300 rounded-lg shadow-sm focus:ring-rose-500 focus:border-rose-500 text-base"
                                                value={worstId}
                                                onChange={(e) => setWorstId(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Pilih Kriteria --</option>
                                                {kriterias.map((k) => (
                                                    <option key={k.id} value={k.id} disabled={String(k.id) === bestId}>
                                                        ({k.kode}) {k.nama}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview Logika */}
                                    {(bestId && worstId) && (
                                        <div className="mt-8 py-6 border-t border-b border-gray-100">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Preview
                                                    Hirarki Keputusan</p>

                                                {/* Flex Container: Kolom di HP, Baris di Desktop */}
                                                <div
                                                    className="flex flex-col md:flex-row items-center justify-center gap-3 text-sm md:text-base">

                                                    {/* BEST */}
                                                    <span
                                                        className="font-bold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-full border border-emerald-200 shadow-sm order-1">
                    {getKriteriaName(bestId)}
                </span>

                                                    {/* PANAH 1 */}
                                                    <div className="flex flex-col items-center order-2">
                                                        <span className="text-gray-400 text-[10px] md:mb-1">Lebih Penting</span>
                                                        {/* Tambahkan 'transform md:-rotate-90' agar panah berputar ke kanan di desktop */}
                                                        <svg
                                                            className="w-5 h-5 text-gray-300 transform md:-rotate-90 transition-transform duration-300"
                                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                                                        </svg>
                                                    </div>

                                                    {/* TENGAH */}
                                                    <span
                                                        className="font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-full border border-gray-200 order-3">
                    Kriteria Lainnya
                </span>

                                                    {/* PANAH 2 */}
                                                    <div className="flex flex-col items-center order-4">
                                                        <span className="text-gray-400 text-[10px] md:mb-1">Lebih Penting</span>
                                                        {/* Tambahkan 'transform md:-rotate-90' */}
                                                        <svg
                                                            className="w-5 h-5 text-gray-300 transform md:-rotate-90 transition-transform duration-300"
                                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                                                        </svg>
                                                    </div>

                                                    {/* WORST */}
                                                    <span
                                                        className="font-bold text-rose-700 bg-rose-100 px-4 py-2 rounded-full border border-rose-200 shadow-sm order-5">
                    {getKriteriaName(worstId)}
                </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end pt-2">
                                        <PrimaryButton
                                            disabled={processing || loading}
                                            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transform transition hover:-translate-y-0.5"
                                        >
                                            {processing ? 'Menyimpan...' : 'Kunci & Simpan Hasil FGD'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}