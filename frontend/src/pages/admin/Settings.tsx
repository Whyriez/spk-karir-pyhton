import { useEffect, useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';
import Header from "../../components/Header.tsx";
import { useLayout } from '@/contexts/useLayout.ts';
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

    const [data, setData] = useState({
        nama_sekolah: "",
        timezone: "Asia/Jakarta",
        ganjil_bulan: "7",
        ganjil_tanggal: "1",
        genap_bulan: "1",
        genap_tanggal: "1",
    });
    // State khusus Logo
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);

    const apiBaseUrl = import.meta.env.VITE_API_URL || '';

    // Fetch data saat component dimuat
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = () => {
        apiClient.get('/settings')
            .then(res => {
                setData(res.data);
                console.log(res.data)
                // Set preview jika ada logo di database
                if (res.data.school_logo) {
                    setLogoPreview(`${apiBaseUrl}/${res.data.school_logo}`);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }

    // --- HANDLE UPLOAD LOGO ---
    const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validasi ukuran (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                MySwal.fire('Error', 'Ukuran file maksimal 2MB', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('logo', file);

            setUploadingLogo(true);
            try {
                const res = await apiClient.post('/settings/upload-logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                // Update preview lokal
                const newUrl = `${apiBaseUrl}/${res.data.url}`;
                setLogoPreview(newUrl);

                // Update Context (Agar Navbar berubah otomatis)
                refreshSettings();

                Toast.fire({ icon: 'success', title: 'Logo berhasil diperbarui!' });
            } catch (error: any) {
                MySwal.fire('Gagal', error.response?.data?.msg || 'Gagal upload logo', 'error');
            } finally {
                setUploadingLogo(false);
            }
        }
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await apiClient.post('/settings', data);
            refreshSettings();
            Toast.fire({ icon: 'success', title: 'Pengaturan berhasil disimpan!' });
        } catch (error: any) {
            MySwal.fire({ icon: 'error', title: 'Oops...', text: error.response?.data?.msg });
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
            <div className="py-8 px-4 sm:px-8">
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

                        <div className="p-6 space-y-8">

                            {/* SECTION 0: LOGO UPLOAD (BARU) */}
                            <div className="flex items-center gap-6 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                                <div className="w-20 h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden shadow-sm relative">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                    {uploadingLogo && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700">Logo Sekolah</h4>
                                    <p className="text-xs text-gray-500 mb-3">Format: PNG, JPG, SVG. Maks 2MB.</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingLogo}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        {uploadingLogo ? 'Mengupload...' : 'Ganti Logo'}
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={submit} className="space-y-8">
                                {/* SECTION 1: IDENTITAS */}
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Nama Sekolah */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Nama Sekolah
                                        </label>
                                        <input
                                            type="text"
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            value={data.nama_sekolah}
                                            onChange={(e) => setData({ ...data, nama_sekolah: e.target.value })}
                                            placeholder="Contoh: SMA Negeri 1 ..."
                                        />
                                    </div>

                                    {/* Zona Waktu */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Zona Waktu
                                        </label>
                                        <select
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            value={data.timezone}
                                            onChange={(e) => setData({ ...data, timezone: e.target.value })}
                                        >
                                            <option value="Asia/Jakarta">WIB (Waktu Indonesia Barat)</option>
                                            <option value="Asia/Makassar">WITA (Waktu Indonesia Tengah)</option>
                                            <option value="Asia/Jayapura">WIT (Waktu Indonesia Timur)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* SECTION 2: OTOMATISASI */}
                                {/* SECTION 2: OTOMATISASI PERGANTIAN PERIODE */}
                                <div className="space-y-4">
                                    <h3 className="text-md font-bold text-gray-800 border-b pb-2">Otomatisasi Periode Akademik</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* SEMESTER GANJIL (Tahun Ajaran Baru & Kenaikan Kelas) */}
                                        <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2 text-indigo-100 opacity-50">
                                                <svg className="w-20 h-20 transform rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                                            </div>
                                            <h4 className="font-bold text-indigo-900 mb-1 relative z-10 flex items-center gap-1">
                                                Semester Ganjil
                                                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">Kenaikan Kelas</span>
                                            </h4>
                                            <p className="text-xs text-indigo-700 mb-4 relative z-10 h-8">
                                                Tahun Ajaran Baru dimulai. Sistem akan otomatis memproses <strong>kenaikan kelas</strong> siswa.
                                            </p>
                                            <div className="flex gap-3 relative z-10">
                                                <div className="w-1/3">
                                                    <label className="block text-xs font-bold text-indigo-800 mb-1">Tgl</label>
                                                    <input type="number" min={1} max={31}
                                                        className="block w-full border-indigo-200 rounded-md text-sm focus:ring-indigo-500 bg-white/80"
                                                        value={data.ganjil_tanggal}
                                                        onChange={(e) => setData({ ...data, ganjil_tanggal: e.target.value })}
                                                    />
                                                </div>
                                                <div className="w-2/3">
                                                    <label className="block text-xs font-bold text-indigo-800 mb-1">Bulan</label>
                                                    <select className="block w-full border-indigo-200 rounded-md text-sm focus:ring-indigo-500 bg-white/80"
                                                        value={data.ganjil_bulan}
                                                        onChange={(e) => setData({ ...data, ganjil_bulan: e.target.value })}
                                                    >
                                                        <option value="1">Januari</option>
                                                        <option value="2">Februari</option>
                                                        <option value="3">Maret</option>
                                                        <option value="4">April</option>
                                                        <option value="5">Mei</option>
                                                        <option value="6">Juni</option>
                                                        <option value="7">Juli (Umumnya)</option>
                                                        <option value="8">Agustus</option>
                                                        <option value="9">September</option>
                                                        <option value="10">Oktober</option>
                                                        <option value="11">November</option>
                                                        <option value="12">Desember</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEMESTER GENAP */}
                                        <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2 text-emerald-100 opacity-50">
                                                <svg className="w-20 h-20 transform -rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z" /></svg>
                                            </div>
                                            <h4 className="font-bold text-emerald-900 mb-1 relative z-10">
                                                Semester Genap
                                            </h4>
                                            <p className="text-xs text-emerald-700 mb-4 relative z-10 h-8">
                                                Periode berganti, <strong>tidak ada</strong> perubahan pada tingkat kelas siswa saat ini.
                                            </p>
                                            <div className="flex gap-3 relative z-10">
                                                <div className="w-1/3">
                                                    <label className="block text-xs font-bold text-emerald-800 mb-1">Tgl</label>
                                                    <input type="number" min={1} max={31}
                                                        className="block w-full border-emerald-200 rounded-md text-sm focus:ring-emerald-500 bg-white/80"
                                                        value={data.genap_tanggal}
                                                        onChange={(e) => setData({ ...data, genap_tanggal: e.target.value })}
                                                    />
                                                </div>
                                                <div className="w-2/3">
                                                    <label className="block text-xs font-bold text-emerald-800 mb-1">Bulan</label>
                                                    <select className="block w-full border-emerald-200 rounded-md text-sm focus:ring-emerald-500 bg-white/80"
                                                        value={data.genap_bulan}
                                                        onChange={(e) => setData({ ...data, genap_bulan: e.target.value })}
                                                    >
                                                        <option value="1">Januari (Umumnya)</option>
                                                        <option value="2">Februari</option>
                                                        <option value="3">Maret</option>
                                                        <option value="4">April</option>
                                                        <option value="5">Mei</option>
                                                        <option value="6">Juni</option>
                                                        <option value="7">Juli</option>
                                                        <option value="8">Agustus</option>
                                                        <option value="9">September</option>
                                                        <option value="10">Oktober</option>
                                                        <option value="11">November</option>
                                                        <option value="12">Desember</option>
                                                    </select>
                                                </div>
                                            </div>
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
            </div>
        </>
    );
}