import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '@/components/Modal';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import DangerButton from '@/components/DangerButton';
import apiClient from '@/lib/axios';
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

interface Alumni {
    id: number;
    name: string;
    status: string;
    batch: string;
    major: string;
}

export default function AlumniIndex() {
    // --- STATE UTAMA ---
    const [data, setData] = useState<Alumni[]>([]);
    const [loading, setLoading] = useState(true);

    // State Selection (Bulk Delete)
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // State Modal CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // State Modal Import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // --- STATE PAGINATION, SEARCH & FILTER ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const [filterBatch, setFilterBatch] = useState('');
    const [filterMajor, setFilterMajor] = useState('');

    // Opsi Dinamis untuk Dropdown
    const [batchOptions, setBatchOptions] = useState<string[]>([]);
    const [majorOptions, setMajorOptions] = useState<string[]>([]);

    const [form, setForm] = useState({ id: 0, name: '', status: '', batch: '', major: '' });

    // --- FETCH DATA ---
    const fetchData = async (page = currentPage, search = searchQuery, batch = filterBatch, major = filterMajor) => {
        setLoading(true);
        try {
            const [resData, resFilters] = await Promise.all([
                apiClient.get(`/alumni`, { params: { page, search, batch, major } }),
                apiClient.get('/alumni/filters')
            ]);

            setData(resData.data.data);

            // Meta Pagination
            setCurrentPage(resData.data.meta.current_page);
            setTotalPages(resData.data.meta.last_page);
            setTotalItems(resData.data.meta.total);

            // Populate Filter Dropdowns
            setBatchOptions(resFilters.data.batches);
            setMajorOptions(resFilters.data.majors);

            setSelectedIds([]);
        } catch (error) {
            console.error("Error fetching alumni:", error);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, filterBatch, filterMajor);
    }, [currentPage, searchQuery, filterBatch, filterMajor]);

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

    // --- HANDLERS FILTER & SEARCH ---
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        setSearchQuery(searchInput);
    };

    const handleFilterChange = (type: 'batch' | 'major', value: string) => {
        setCurrentPage(1);
        if (type === 'batch') setFilterBatch(value);
        if (type === 'major') setFilterMajor(value);
    };

    // --- HANDLERS SELECTION & BULK DELETE ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? data.map(item => item.id) : []);
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const executeBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        MySwal.fire({
            title: `Hapus ${selectedIds.length} data?`,
            text: "Data yang dihapus tidak dapat dikembalikan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.post('/alumni/bulk-destroy', { ids: selectedIds });
                    fetchData();
                    Toast.fire({ icon: 'success', title: 'Data berhasil dihapus.' });
                } catch (error) {
                    MySwal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                }
            }
        });
    };

    // --- HANDLERS CRUD ---
    const openModal = (item: Alumni | null = null) => {
        setErrors({});
        if (item) {
            setIsEditMode(true);
            setForm({ id: item.id, name: item.name, status: item.status, batch: item.batch, major: item.major });
        } else {
            setIsEditMode(false);
            setForm({ id: 0, name: '', status: '', batch: '', major: '' });
        }
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!form.name.trim()) { newErrors.name = 'Nama wajib diisi.'; isValid = false; }
        if (!String(form.batch).trim()) { newErrors.batch = 'Angkatan wajib diisi.'; isValid = false; }
        if (!form.major.trim()) { newErrors.major = 'Jurusan wajib diisi.'; isValid = false; }
        if (!form.status.trim()) { newErrors.status = 'Status wajib diisi.'; isValid = false; }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setProcessing(true);
        try {
            if (isEditMode) {
                await apiClient.put(`/alumni/${form.id}`, form);
                Toast.fire({ icon: 'success', title: 'Data diperbarui!' });
            } else {
                await apiClient.post('/alumni', form);
                Toast.fire({ icon: 'success', title: 'Data ditambahkan!' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        MySwal.fire({
            title: 'Hapus data alumni?',
            text: "Data ini akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/alumni/${id}`);
                    fetchData();
                    Toast.fire({ icon: 'success', title: 'Data dihapus.' });
                } catch (error) {
                    MySwal.fire('Gagal!', 'Gagal menghapus data.', 'error');
                }
            }
        });
    };

    // --- HANDLERS IMPORT ---
    const handlePreview = async () => {
        if (!importFile) return MySwal.fire({ icon: 'warning', title: 'Pilih file terlebih dahulu' });
        setIsLoadingPreview(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await apiClient.post('/alumni/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPreviewData(res.data);
            Toast.fire({ icon: 'success', title: 'Preview berhasil.' });
        } catch (e) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file Excel.' });
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleImportSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!importFile) return;
        setProcessing(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await apiClient.post('/alumni/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsImportModalOpen(false);
            setImportFile(null);
            setPreviewData([]);
            fetchData();
            MySwal.fire({ icon: 'success', title: 'Berhasil', text: res.data.msg });
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan import.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Data Alumni</h2>
                </div>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* TOOLBAR BULK ACTION */}
                    {selectedIds.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 shadow-sm rounded-r flex justify-between items-center animate-pulse">
                            <div className="font-bold text-red-700">{selectedIds.length} Data Dipilih.</div>
                            <button onClick={executeBulkDelete} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-red-700 shadow">
                                Hapus Terpilih
                            </button>
                        </div>
                    )}

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">

                        {/* --- TOP HEADER: SEARCH, FILTER, & BUTTONS --- */}
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                            <div className="flex flex-col">
                                <span className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Alumni</span>
                                <span className="text-sm text-gray-500">Total: {totalItems} Alumni</span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-start md:items-center">

                                {/* KELOMPOK PENCARIAN & FILTER */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Cari nama, status..."
                                            className="border-gray-300 rounded-l-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full sm:w-48"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                        />
                                        <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-l-0 border-gray-300 rounded-r-md px-3 text-gray-600 font-medium transition-colors">
                                            Cari
                                        </button>
                                    </form>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <select
                                            className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-1/3 sm:w-auto text-gray-600 font-medium cursor-pointer"
                                            value={filterBatch}
                                            onChange={(e) => handleFilterChange('batch', e.target.value)}
                                        >
                                            <option value="">Semua Angkatan</option>
                                            {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        <select
                                            className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-2/3 sm:w-auto max-w-[200px] text-gray-600 font-medium cursor-pointer truncate"
                                            value={filterMajor}
                                            onChange={(e) => handleFilterChange('major', e.target.value)}
                                        >
                                            <option value="">Semua Jurusan</option>
                                            {majorOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* KELOMPOK TOMBOL AKSI */}
                                <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end md:ml-2">
                                    <SecondaryButton onClick={() => setIsImportModalOpen(true)}>Import Excel</SecondaryButton>
                                    <PrimaryButton onClick={() => openModal(null)}>+ Tambah</PrimaryButton>
                                </div>
                            </div>
                        </div>

                        {/* --- TABEL DATA --- */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm cursor-pointer" onChange={handleSelectAll} checked={data.length > 0 && selectedIds.length === data.length} />
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">No</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Angkatan</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jurusan</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Saat Ini</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Memuat data...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data alumni sesuai filter.</td></tr>
                                    ) : (
                                        data.map((alumni, index) => (
                                            <tr key={alumni.id} className={`transition-colors ${selectedIds.includes(alumni.id) ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm cursor-pointer" checked={selectedIds.includes(alumni.id)} onChange={() => handleSelectOne(alumni.id)} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                    {(currentPage - 1) * 10 + index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{alumni.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200">
                                                        {alumni.batch}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 truncate max-w-xs" title={alumni.major}>{alumni.major}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase border border-blue-200">
                                                        {alumni.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openModal(alumni)} className="text-indigo-600 hover:text-indigo-900 font-bold mr-4">Edit</button>
                                                    <button onClick={() => handleDelete(alumni.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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

            {/* MODAL FORM CRUD */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">{isEditMode ? "Edit Data Alumni" : "Tambah Alumni Baru"}</h2>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Nama Lengkap" required />
                                <TextInput className={`mt-1 block w-full ${errors.name ? 'border-red-500' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Lengkap" />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Angkatan" required />
                                    <TextInput type="number" className={`mt-1 block w-full ${errors.batch ? 'border-red-500' : ''}`} value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="2023" />
                                    {errors.batch && <p className="text-red-500 text-xs mt-1">{errors.batch}</p>}
                                </div>
                                <div>
                                    <InputLabel value="Jurusan" required />
                                    <TextInput className={`mt-1 block w-full ${errors.major ? 'border-red-500' : ''}`} value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="Contoh: TKJ" />
                                    {errors.major && <p className="text-red-500 text-xs mt-1">{errors.major}</p>}
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Status Saat Ini" required />
                                <TextInput className={`mt-1 block w-full ${errors.status ? 'border-red-500' : ''}`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="Contoh: Kuliah di UNG / Kerja di PT Maju / Wirausaha" />
                                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan Data'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL IMPORT EXCEL */}
            <Modal show={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleImportSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">Import Data Alumni</h2>
                        <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <span>Gunakan format Excel yang sesuai.</span>
                            <a href="/api/alumni/template" className="flex items-center gap-1 font-bold hover:underline text-blue-700 whitespace-nowrap">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Template
                            </a>
                        </div>
                        <div className="mb-4 flex gap-2 items-end">
                            <div className="w-full">
                                <InputLabel value="Pilih File Excel" />
                                <input type="file" className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2" onChange={(e) => { setImportFile(e.target.files ? e.target.files[0] : null); setPreviewData([]); }} accept=".xlsx, .xls, .csv" />
                            </div>
                            <SecondaryButton type="button" onClick={handlePreview} disabled={isLoadingPreview || !importFile} className="mb-0.5 h-10">
                                {isLoadingPreview ? "Loading..." : "Preview"}
                            </SecondaryButton>
                        </div>
                        {previewData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b font-bold text-sm text-gray-700">Preview Data ({previewData.length} Baris)</div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Angkatan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jurusan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.nama}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.angkatan}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.jurusan}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsImportModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing || (previewData.length === 0 && isImportModalOpen && !importFile)} className={previewData.length === 0 ? "opacity-75" : ""}>
                            {processing ? "Mengupload..." : "Import Sekarang"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}