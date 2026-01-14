import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';
import Header from "../../components/Header.tsx";
import { useLayout } from '@/contexts/LayoutContext';
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

export default function Settings() {
    // Ambil fungsi refreshSettings dari context
    const { refreshSettings } = useLayout();

    // State form sesuai dengan field di Laravel
    const [data, setData] = useState({
        nama_sekolah: "",
        timezone: "Asia/Jakarta",
        periode_bulan: "7", // Default Juli
        periode_tanggal: "1", // Default Tgl 1
    });

    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch data saat component dimuat
    useEffect(() => {
        apiClient.get('/settings')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                Toast.fire({ icon: 'error', title: 'Gagal memuat pengaturan.' });
                setLoading(false);
            });
    }, []);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        try {
            await apiClient.post('/settings', data);

            // UPDATE NAVBAR SETELAH SUKSES
            refreshSettings();

            Toast.fire({
                icon: 'success',
                title: 'Pengaturan berhasil disimpan!'
            });
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.msg || "Gagal menyimpan pengaturan.";
            MySwal.fire({
                icon: 'error',
                title: 'Oops...',
                text: msg
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-500 text-sm">Memuat pengaturan...</p>
            </div>
        );
    }

    return (
        <>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Pengaturan Sekolah
                </h2>
            </Header>
            <div className="py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        {/* Header Section */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-full">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Konfigurasi Sistem</h3>
                                <p className="text-xs text-gray-500">Sesuaikan identitas dan parameter waktu sistem.</p>
                            </div>
                        </div>

                        <form onSubmit={submit} className="p-6 space-y-8">

                            {/* SECTION 1: IDENTITAS */}
                            <div className="grid grid-cols-1 gap-6">
                                {/* Nama Sekolah */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Nama Sekolah
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                            value={data.nama_sekolah}
                                            onChange={(e) => setData({ ...data, nama_sekolah: e.target.value })}
                                            placeholder="Contoh: SMA Negeri 1 ..."
                                        />
                                    </div>
                                </div>

                                {/* Zona Waktu */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Zona Waktu
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <select
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                            value={data.timezone}
                                            onChange={(e) => setData({ ...data, timezone: e.target.value })}
                                        >
                                            <option value="Asia/Jakarta">WIB (Waktu Indonesia Barat)</option>
                                            <option value="Asia/Makassar">WITA (Waktu Indonesia Tengah)</option>
                                            <option value="Asia/Jayapura">WIT (Waktu Indonesia Timur)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: OTOMATISASI */}
                            <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 relative overflow-hidden">
                                {/* Dekorasi Latar */}
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-indigo-100">
                                    <svg className="w-24 h-24 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                </div>

                                <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2 relative z-10">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    Jadwal Ganti Periode Otomatis
                                </h4>
                                <p className="text-xs text-indigo-700 mb-4 relative z-10">
                                    Sistem akan otomatis membuat <strong>Tahun Ajaran Baru</strong> pada tanggal ini setiap tahunnya.
                                </p>

                                <div className="flex gap-4 relative z-10">
                                    {/* TANGGAL */}
                                    <div className="w-1/3">
                                        <label className="block text-xs font-bold text-indigo-800 mb-1">
                                            Tanggal
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={31}
                                            className="block w-full border-indigo-200 rounded-md text-sm focus:ring-indigo-500 bg-white/80"
                                            value={data.periode_tanggal}
                                            onChange={(e) => setData({ ...data, periode_tanggal: e.target.value })}
                                        />
                                    </div>

                                    {/* BULAN */}
                                    <div className="w-2/3">
                                        <label className="block text-xs font-bold text-indigo-800 mb-1">
                                            Bulan
                                        </label>
                                        <select
                                            className="block w-full border-indigo-200 rounded-md text-sm focus:ring-indigo-500 bg-white/80"
                                            value={data.periode_bulan}
                                            onChange={(e) => setData({ ...data, periode_bulan: e.target.value })}
                                        >
                                            <option value="1">Januari</option>
                                            <option value="2">Februari</option>
                                            <option value="3">Maret</option>
                                            <option value="4">April</option>
                                            <option value="5">Mei</option>
                                            <option value="6">Juni</option>
                                            <option value="7">Juli (Tahun Ajaran Baru)</option>
                                            <option value="8">Agustus</option>
                                            <option value="9">September</option>
                                            <option value="10">Oktober</option>
                                            <option value="11">November</option>
                                            <option value="12">Desember</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <PrimaryButton disabled={processing} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 shadow-lg">
                                    {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}