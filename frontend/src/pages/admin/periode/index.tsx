import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import InputLabel from '@/components/InputLabel';
import apiClient from "@/lib/axios";
import Header from "@/components/Header";
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

interface Periode {
    id: number;
    nama_periode: string;
    is_active: boolean;
    jumlah_siswa: number;
}

export default function PeriodeIndex() {
    const [periodes, setPeriodes] = useState<Periode[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    // Validasi State
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/periode');
            setPeriodes(res.data.periodes);
        } catch (err) {
            console.error(err);
            Toast.fire({icon: 'error', title: 'Gagal memuat data periode.'});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activePeriodeId = periodes.find(p => p.is_active)?.id || 0;

    // --- LOGIKA AKTIVASI & KENAIKAN KELAS ---
    const handleActivate = async (id: number, nama: string) => {
        const isPromotion = id > activePeriodeId;

        // Konfigurasi pesan alert berdasarkan jenis aktivasi (Maju/Mundur)
        const title = isPromotion ? 'Ganti Periode & Naik Kelas?' : 'Kembali ke Periode Lalu?';
        const text = isPromotion
            ? `Anda akan mengaktifkan "${nama}". Sistem akan otomatis memproses KENAIKAN KELAS siswa dari periode sebelumnya. Pastikan data nilai sudah final.`
            : `Anda akan kembali ke "${nama}". Sistem TIDAK AKAN memproses kenaikan kelas (hanya pindah status aktif).`;
        const icon = isPromotion ? 'warning' : 'question';
        const confirmBtnText = isPromotion ? 'Ya, Proses Kenaikan Kelas!' : 'Ya, Aktifkan Saja';

        MySwal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: isPromotion ? '#d33' : '#3085d6', // Merah jika promosi (berisiko), Biru jika biasa
            cancelButtonColor: '#aaa',
            confirmButtonText: confirmBtnText,
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Tampilkan loading screen karena proses migrasi bisa lama
                MySwal.fire({
                    title: 'Sedang Memproses...',
                    text: 'Mohon tunggu sebentar, sedang mengatur data siswa.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const res = await apiClient.post(`/periode/${id}/activate`);
                    MySwal.close(); // Tutup loading

                    await fetchData();

                    MySwal.fire({
                        icon: 'success',
                        title: 'Berhasil!',
                        text: res.data.msg || 'Periode berhasil diaktifkan.'
                    });

                } catch (err: any) {
                    MySwal.close();
                    const msg = err.response?.data?.msg || 'Gagal mengaktifkan periode.';
                    MySwal.fire({icon: 'error', title: 'Gagal', text: msg});
                }
            }
        });
    };

    const handleDelete = async (id: number) => {
        MySwal.fire({
            title: 'Hapus Periode?',
            text: "Data history nilai dan rekomendasi pada periode ini akan hilang permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/periode/${id}`);
                    fetchData();
                    Toast.fire({icon: 'success', title: 'Periode berhasil dihapus.'});
                } catch (err: any) {
                    const msg = err.response?.data?.msg || 'Gagal menghapus data.';
                    MySwal.fire({icon: 'error', title: 'Gagal', text: msg});
                }
            }
        });
    };

    const openModal = (item?: any) => {
        setErrors({});
        setFormName(item ? item.nama_periode : '');
        setEditingId(item ? item.id : null);
        setShowModal(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Simple Validation
        if (!formName.trim()) {
            setErrors({nama: 'Nama periode wajib diisi.'});
            return;
        }

        setProcessing(true);
        try {
            if (editingId) {
                await apiClient.put(`/periode/${editingId}`, {nama_periode: formName});
                Toast.fire({icon: 'success', title: 'Periode diperbarui!'});
            } else {
                await apiClient.post('/periode', {nama_periode: formName});
                Toast.fire({icon: 'success', title: 'Periode ditambahkan!'});
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            MySwal.fire({icon: 'error', title: 'Gagal', text: 'Gagal menyimpan data periode.'});
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800">Manajemen Periode & Tahun Ajaran</h2>

                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* INFO CARD */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 shadow-sm rounded-r-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    <strong>Info Kenaikan Kelas:</strong> Mengaktifkan periode baru (Tahun Ajaran baru)
                                    akan otomatis memicu proses migrasi dan kenaikan kelas untuk seluruh siswa dari
                                    periode sebelumnya.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Tahun Ajaran
                                </div>

                                {/*/!* Search *!/*/}
                                {/*<TextInput*/}
                                {/*    type="text"*/}
                                {/*    placeholder="Cari nama, jurusan..."*/}
                                {/*    value={searchTerm}*/}
                                {/*    onChange={(e) => setSearchTerm(e.target.value)}*/}
                                {/*    className="w-full smw-64 text-sm"*/}
                                {/*/>*/}
                            </div>

                            <div className="flex gap-2 w-full md:w-auto justify-end">

                                <PrimaryButton onClick={() => openModal()}>
                                    + Tambah Periode
                                </PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama
                                        Periode
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data
                                        Siswa
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">Sedang memuat
                                            data...
                                        </td>
                                    </tr>
                                ) : periodes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">Belum ada periode.
                                        </td>
                                    </tr>
                                ) : (
                                    periodes.map((item) => (
                                        <tr key={item.id}
                                            className={`transition-colors ${item.is_active ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`text-sm font-bold ${item.is_active ? 'text-green-900' : 'text-gray-900'}`}>
                                                    {item.nama_periode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.is_active ? (
                                                    <span
                                                        className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-200 items-center gap-1">
                                                        <span
                                                            className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                        AKTIF SEKARANG
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivate(item.id, item.nama_periode)}
                                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all focus:outline-none"
                                                    >
                                                        Aktifkan
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span
                                                    className="font-mono font-bold text-gray-700">{item.jumlah_siswa}</span> Siswa
                                                Terdaftar
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => openModal(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 font-bold">Edit
                                                    </button>
                                                    {!item.is_active && (
                                                        <button onClick={() => handleDelete(item.id)}
                                                                className="text-red-600 hover:text-red-900">Hapus</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL FORM (Sticky) */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingId ? 'Edit Periode' : 'Tambah Periode Baru'}
                        </h2>
                        <button type="button" onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div>
                            <InputLabel value="Nama Periode / Tahun Ajaran" required/>
                            <TextInput
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className={`w-full mt-1 ${errors.nama ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Contoh: TA 2025/2026"
                                autoFocus
                            />
                            {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
                            <p className="text-xs text-gray-500 mt-2">
                                Format disarankan: <strong>TA YYYY/YYYY</strong>.
                            </p>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}