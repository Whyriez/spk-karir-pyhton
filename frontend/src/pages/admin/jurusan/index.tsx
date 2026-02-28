import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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

interface Jurusan {
    id: number;
    kode: string;
    nama: string;
}

export default function JurusanIndex() {
    // --- STATE UTAMA ---
    const [data, setData] = useState<Jurusan[]>([]);
    const [loading, setLoading] = useState(true);

    // --- STATE PAGINATION & SEARCH ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // --- STATE MODAL CRUD ---
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<{ id: number | null, kode: string, nama: string }>({ id: null, kode: '', nama: '' });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // --- FETCH DATA ---
    const fetchData = async (page = currentPage, search = searchQuery) => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/jurusan?page=${page}&per_page=10&search=${search}`);
            
            // Cek apakah API mengembalikan format pagination
            if (res.data.meta) {
                setData(res.data.data);
                setCurrentPage(res.data.meta.current_page);
                setTotalPages(res.data.meta.total_pages);
                setTotalItems(res.data.meta.total_items);
            } else {
                // Fallback jika API belum update
                setData(res.data.data);
                setTotalItems(res.data.data.length);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data jurusan.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery);
    }, [currentPage, searchQuery]);

    // --- LOGIKA PAGINATION ANGKA CERDAS ---
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    // --- HANDLERS SEARCH ---
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset ke halaman 1 saat mencari
        setSearchQuery(searchInput);
    };

    // --- HANDLERS CRUD ---
    const openModal = (item: Jurusan | null = null) => {
        setErrors({}); // Reset error saat modal dibuka
        setForm(item ? { ...item } : { id: null, kode: '', nama: '' });
        setShowModal(true);
    };

    const validateForm = () => {
        let newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!form.kode.trim()) {
            newErrors.kode = 'Kode jurusan wajib diisi.';
            isValid = false;
        }
        if (!form.nama.trim()) {
            newErrors.nama = 'Nama jurusan wajib diisi.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setProcessing(true);

        try {
            if (form.id) {
                await apiClient.put(`/jurusan/${form.id}`, form);
                Toast.fire({ icon: 'success', title: 'Jurusan diperbarui!' });
            } else {
                await apiClient.post('/jurusan', form);
                Toast.fire({ icon: 'success', title: 'Jurusan ditambahkan!' });
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.msg || 'Gagal menyimpan data.';
            MySwal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = (id: number) => {
        MySwal.fire({
            title: 'Hapus Jurusan?',
            text: "Data siswa yang terhubung dengan jurusan ini mungkin akan terpengaruh.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/jurusan/${id}`);
                    fetchData();
                    Toast.fire({ icon: 'success', title: 'Jurusan dihapus.' });
                } catch (err) {
                    MySwal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                }
            }
        });
    };

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Data Jurusan</h2>
                </div>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        
                        {/* --- TOP HEADER: SEARCH & BUTTONS --- */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                            <div className="flex flex-col">
                                <span className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Jurusan</span>
                                <span className="text-sm text-gray-500">Total: {totalItems} Jurusan</span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-start sm:items-center">
                                {/* KOTAK PENCARIAN */}
                                <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Cari kode atau nama..."
                                        className="border-gray-300 rounded-l-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full sm:w-56"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                    />
                                    <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-l-0 border-gray-300 rounded-r-md px-3 text-gray-600 font-medium transition-colors">
                                        Cari
                                    </button>
                                </form>

                                {/* TOMBOL TAMBAH */}
                                <div className="flex w-full sm:w-auto justify-end shrink-0 sm:ml-2">
                                    <PrimaryButton onClick={() => openModal()} className="w-full sm:w-auto justify-center">
                                        + Tambah Jurusan
                                    </PrimaryButton>
                                </div>
                            </div>
                        </div>

                        {/* --- TABEL DATA --- */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">No</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Kode</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Jurusan</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Sedang memuat data...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Belum ada data jurusan.</td></tr>
                                    ) : (
                                        data.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                    {(currentPage - 1) * 10 + index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700">
                                                        {item.kode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{item.nama}</td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <button onClick={() => openModal(item)} className="text-indigo-600 hover:text-indigo-900 font-bold mr-4">Edit</button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- PAGINATION CONTROLS --- */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-md">
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Menampilkan halaman <span className="font-medium">{currentPage}</span> dari <span className="font-medium">{totalPages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                            >
                                                <span className="sr-only">Previous</span>
                                                &larr; Prev
                                            </button>

                                            {getPageNumbers().map((page, index) => (
                                                page === '...' ? (
                                                    <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                                        ...
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={index}
                                                        onClick={() => setCurrentPage(page as number)}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 transition-colors
                                                            ${currentPage === page 
                                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' 
                                                                : 'text-gray-900 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            ))}

                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                            >
                                                <span className="sr-only">Next</span>
                                                Next &rarr;
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL FORM */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    {/* HEADER (Sticky) */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white">
                        <h2 className="text-lg font-bold text-gray-800">
                            {form.id ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
                        </h2>
                        <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* CONTENT (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Kode Jurusan" required />
                                <TextInput
                                    value={form.kode}
                                    onChange={(e) => setForm({ ...form, kode: e.target.value })}
                                    className={`w-full mt-1 uppercase font-bold ${errors.kode ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="TKJ"
                                    disabled={!!form.id} // Kode tidak bisa diedit jika update
                                />
                                {errors.kode && <p className="text-red-500 text-xs mt-1">{errors.kode}</p>}
                                {form.id && <p className="text-xs text-gray-400 mt-1 italic">Kode tidak dapat diubah setelah dibuat.</p>}
                            </div>
                            <div>
                                <InputLabel value="Nama Jurusan" required />
                                <TextInput
                                    value={form.nama}
                                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                                    className={`w-full mt-1 ${errors.nama ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Teknik Komputer dan Jaringan"
                                />
                                {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER (Sticky) */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 rounded-b-lg">
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