import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import InputLabel from '@/components/InputLabel';
import apiClient from "@/lib/axios";
import Header from "@/components/Header";
import { useNavigate } from 'react-router-dom';
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

// Tipe Data Sederhana
interface Jurusan {
    id: number;
    kode: string;
    nama: string;
}

interface StaticItem {
    kriteria_id: number;
    kode: string;
    nama: string;
    nilai: number | string; // Bisa string saat mengetik (misal "0.")
    skala_maks: number;
    tipe_input: string;
}

export default function JurusanPakarIndex() {
    const [data, setData] = useState<Jurusan[]>([]);
    const [loading, setLoading] = useState(true);

    // State Modal Static Data
    const [showStaticModal, setShowStaticModal] = useState(false);
    const [selectedJurusan, setSelectedJurusan] = useState<Jurusan | null>(null);
    const [staticItems, setStaticItems] = useState<StaticItem[]>([]);
    const [processing, setProcessing] = useState(false);

    // Get User Data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    // Proteksi Akses: Hanya untuk Kaprodi
    useEffect(() => {
        if (user.role === 'pakar' && user.jenis_pakar !== 'kaprodi') {
            MySwal.fire({
                icon: 'error',
                title: 'Akses Ditolak',
                text: 'Halaman ini hanya untuk Kaprodi.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                navigate('/dashboard');
            });
        }
    }, [user, navigate]);

    // FETCH DATA MENGGUNAKAN ROUTING KHUSUS
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/jurusan/me');
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data jurusan.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (user.jenis_pakar === 'kaprodi') {
            fetchData();
        } else {
            setLoading(false);
        }
    }, []);

    // --- HANDLERS STATIC DATA ---

    const openStaticModal = async (item: Jurusan) => {
        setSelectedJurusan(item);
        setStaticItems([]);
        setShowStaticModal(true);

        // Show loading in modal content if needed, or rely on empty state
        try {
            const res = await apiClient.get(`/jurusan/${item.id}/static-values`);
            setStaticItems(res.data.values);
        } catch (error) {
            console.error(error);
            Toast.fire({ icon: 'error', title: 'Gagal mengambil data statis.' });
            setShowStaticModal(false);
        }
    };

    const handleStaticChange = (index: number, val: string) => {
        const newItems = [...staticItems];

        // 1. Handle Input Kosong (Biar bisa hapus semua angka)
        if (val === '') {
            newItems[index].nilai = '';
            setStaticItems(newItems);
            return;
        }

        const numVal = parseFloat(val);
        const maxVal = newItems[index].skala_maks;

        // 2. VALIDASI KETAT (Typing)
        // Jika angka valid DAN melebihi batas maksimal -> TOLAK PERUBAHAN
        // Input tidak akan berubah (tetap angka sebelumnya)
        if (!isNaN(numVal) && numVal > maxVal) {
            // Optional: Toast warning kecil agar user sadar
            // Toast.fire({ icon: 'warning', title: `Maksimal nilai adalah ${maxVal}` });
            return;
        }

        // 3. Validasi Min (Tidak boleh negatif)
        if (!isNaN(numVal) && numVal < 0) {
            return;
        }

        // Update state jika lolos validasi
        newItems[index].nilai = val.endsWith('.') ? val : numVal;
        setStaticItems(newItems);
    };

    const handleStaticSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedJurusan) return;

        // VALIDASI AKHIR SEBELUM KIRIM
        const invalidItems = staticItems.filter(item => {
            const val = Number(item.nilai);
            return val > item.skala_maks || val < 0;
        });

        if (invalidItems.length > 0) {
            const kodeList = invalidItems.map(i => i.kode).join(', ');
            MySwal.fire({
                icon: 'error',
                title: 'Nilai Tidak Valid',
                text: `Kriteria berikut melebihi skala maksimal: ${kodeList}`,
            });
            return;
        }

        setProcessing(true);

        try {
            // Bersihkan data (convert ke float murni)
            const payloadItems = staticItems.map(item => ({
                ...item,
                nilai: (item.nilai === '' || item.nilai === null) ? 0 : parseFloat(String(item.nilai))
            }));

            await apiClient.post(`/jurusan/${selectedJurusan.id}/static-values`, {
                items: payloadItems
            });

            Toast.fire({
                icon: 'success',
                title: 'Data statis berhasil disimpan!'
            });
            setShowStaticModal(false);
        } catch (error) {
            console.error(error);
            MySwal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: 'Terjadi kesalahan saat menyimpan data ke server.'
            });
        } finally {
            setProcessing(false);
        }
    };

    if (user.jenis_pakar !== 'kaprodi') return null;

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800">Data Jurusan & Nilai Static</h2>
                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* INFO BOX */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 shadow-sm rounded-r-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    <strong>Area Pakar Kaprodi:</strong> Data di bawah adalah jurusan yang Anda ampu. Silakan kelola nilai kriteria statisnya.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Kode</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Jurusan</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">Memuat data jurusan Anda...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500 bg-gray-50 rounded italic">
                                            Anda belum ditautkan ke jurusan manapun. Silakan hubungi Admin.
                                        </td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        {item.kode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.nama}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => openStaticModal(item)}
                                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                        Input Nilai
                                                    </button>
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
            </div>

            {/* MODAL STATIC DATA JURUSAN */}
            <Modal show={showStaticModal} onClose={() => setShowStaticModal(false)} maxWidth="lg">
                <form onSubmit={handleStaticSubmit} className="flex flex-col max-h-[85vh]">

                    {/* Header Modal */}
                    <div className="flex-none px-6 py-4 border-b bg-white flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">
                            Input Nilai: <span className="text-indigo-600">{selectedJurusan?.nama}</span>
                        </h2>
                        <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                            {selectedJurusan?.kode}
                        </span>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {staticItems.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500 italic">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Tidak ada kriteria bertipe "Static Jurusan" yang ditemukan.
                                <br/>
                                <small>Silakan hubungi Admin untuk menambahkan kriteria.</small>
                            </div>
                        ) : (
                            staticItems.map((item, index) => (
                                <div key={item.kriteria_id} className="group">
                                    <div className="flex justify-between items-end mb-1">
                                        <InputLabel value={`${item.kode} - ${item.nama}`} className="text-gray-700" />
                                        <span className="text-[10px] text-gray-400 group-hover:text-indigo-500 transition-colors">
                                            Skala Maks: <b>{item.skala_maks}</b>
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <TextInput
                                            type="number"
                                            value={item.nilai}
                                            onChange={(e) => handleStaticChange(index, e.target.value)}
                                            className="w-full pl-3 pr-16 font-bold text-gray-800"
                                            placeholder="0"
                                            min={0}
                                            max={item.skala_maks}
                                            step="0.01"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <span className="text-gray-400 text-xs">/ {item.skala_maks}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Modal */}
                    <div className="flex-none px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setShowStaticModal(false)}>
                            Tutup
                        </SecondaryButton>
                        {staticItems.length > 0 && (
                            <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </PrimaryButton>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}