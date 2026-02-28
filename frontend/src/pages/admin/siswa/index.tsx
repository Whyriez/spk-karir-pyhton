import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import Checkbox from '@/components/Checkbox';
import apiClient from '@/lib/axios';
import Header from "@/components/Header";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// --- KONFIGURASI TOAST ---
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

interface Siswa {
    id: number;
    username: string; // NISN
    name: string;
    kelas_saat_ini: string;
    jurusan_nama: string;
    jurusan_id?: number;
    status_akhir_periode_ini?: string;
}

interface Jurusan {
    id: number;
    nama: string;
}

export default function AdminSiswaIndex() {
    const [data, setData] = useState<Siswa[]>([]);
    const [jurusans, setJurusans] = useState<Jurusan[]>([]);
    const [loading, setLoading] = useState(true);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Modal CRUD State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Modal Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // --- STATE PAGINATION, SEARCH, & FILTERS ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Filter Baru
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJurusan, setFilterJurusan] = useState('');

    const [processing, setProcessing] = useState(false);

    // Form CRUD
    const initialForm = {
        id: null,
        username: '',
        name: '',
        kelas: '10',
        jurusan_id: '',
        reset_password: false
    };
    const [form, setForm] = useState(initialForm);

    // --- FETCH DATA ---
    const fetchData = async (page = currentPage, search = searchQuery, kelas = filterKelas, jurusan = filterJurusan) => {
        setLoading(true);
        try {
            const [resSiswa, resJurusan] = await Promise.all([
                apiClient.get(`/admin/siswa?page=${page}&per_page=10&search=${search}&kelas=${kelas}&jurusan_id=${jurusan}`),
                apiClient.get('/jurusan')
            ]);
            setData(resSiswa.data.data);

            // Update Meta Pagination
            setCurrentPage(resSiswa.data.meta.current_page);
            setTotalPages(resSiswa.data.meta.total_pages);
            setTotalItems(resSiswa.data.meta.total_items);

            setJurusans(resJurusan.data.data);
            setSelectedIds([]); // Reset selection setiap pindah halaman/filter
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    };

    // Panggil ulang jika parameter fetch berubah
    useEffect(() => {
        fetchData(currentPage, searchQuery, filterKelas, filterJurusan);
    }, [currentPage, searchQuery, filterKelas, filterJurusan]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset ke halaman 1 saat mencari
        setSearchQuery(searchInput);
    };

    // Handler Filter Otomatis
    const handleFilterChange = (type: 'kelas' | 'jurusan', value: string) => {
        setCurrentPage(1); // Kembali ke halaman 1 tiap ganti filter
        if (type === 'kelas') setFilterKelas(value);
        if (type === 'jurusan') setFilterJurusan(value);
    };

    // --- IMPORT HANDLERS ---
    const handlePreview = async () => {
        if (!importFile) return Toast.fire({ icon: 'warning', title: 'Pilih file excel dulu.' });

        setIsLoadingPreview(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await apiClient.post('/admin/siswa/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPreviewData(res.data);
            Toast.fire({ icon: 'success', title: 'Preview berhasil.' });
        } catch (error: any) {
            const msg = error.response?.data?.msg || 'Gagal membaca file.';
            MySwal.fire('Error', msg, 'error');
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
            const res = await apiClient.post('/admin/siswa/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsImportModalOpen(false);
            setImportFile(null);
            setPreviewData([]);
            fetchData(); // Refresh table

            let msg = res.data.msg;
            if (res.data.errors && res.data.errors.length > 0) {
                msg += '\n\nNote: ' + res.data.errors.join('\n');
            }
            MySwal.fire({
                icon: 'success',
                title: 'Import Selesai',
                text: msg,
                width: 600
            });

        } catch (error: any) {
            const msg = error.response?.data?.msg || 'Terjadi kesalahan import.';
            MySwal.fire('Gagal', msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    // --- BULK ACTION HANDLERS ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? data.map(s => s.id) : []);
    };

    const handleSelectRow = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async (newStatus: string) => {
        if (selectedIds.length === 0) return;
        const label = newStatus === 'Tinggal Kelas' ? 'Tinggal Kelas' : 'Naik Kelas';

        MySwal.fire({
            title: `Set ${selectedIds.length} Siswa?`,
            text: `Ubah status menjadi "${label}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Ubah',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.post('/admin/siswa/update-status-kenaikan-bulk', {
                        siswa_ids: selectedIds,
                        status: newStatus
                    });
                    Toast.fire({ icon: 'success', title: 'Status diperbarui!' });
                    fetchData();
                } catch (error) {
                    Toast.fire({ icon: 'error', title: 'Gagal update status' });
                }
            }
        });
    };

    // --- CRUD HANDLERS (Standard) ---
    const openModal = (item: any = null) => {
        if (item) {
            setIsEditMode(true);
            setForm({
                ...initialForm,
                ...item,
                kelas: item.kelas_saat_ini || '10',
                jurusan_id: item.jurusan_id || '',
                reset_password: false
            });
        } else {
            setIsEditMode(false);
            setForm(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (isEditMode && form.id) {
                await apiClient.put(`/admin/siswa/${form.id}`, form);
                Toast.fire({ icon: 'success', title: 'Data diperbarui!' });
            } else {
                await apiClient.post('/admin/siswa', form);
                Toast.fire({ icon: 'success', title: 'Siswa ditambahkan!' });
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            const msg = err.response?.data?.msg || 'Gagal menyimpan.';
            MySwal.fire('Error', msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = (id: number) => {
        MySwal.fire({
            title: 'Hapus Siswa?',
            text: "Data history nilai akan hilang permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/admin/siswa/${id}`);
                    fetchData();
                    Toast.fire({ icon: 'success', title: 'Terhapus' });
                } catch (err) {
                    MySwal.fire('Gagal', 'Terjadi kesalahan', 'error');
                }
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        MySwal.fire({
            title: `Hapus ${selectedIds.length} Siswa Terpilih?`,
            text: "Data history nilai dan hasil rekomendasi mereka akan ikut terhapus permanen!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setProcessing(true);
                    await apiClient.post('/admin/siswa/delete-bulk', {
                        siswa_ids: selectedIds
                    });
                    Toast.fire({ icon: 'success', title: `${selectedIds.length} siswa berhasil dihapus!` });

                    setSelectedIds([]);
                    fetchData(currentPage, searchQuery);
                } catch (error: any) {
                    const msg = error.response?.data?.msg || 'Gagal menghapus data siswa.';
                    MySwal.fire('Error', msg, 'error');
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

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

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Data Siswa</h2>
                </div>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* TOOLBAR BULK ACTION */}
                    {selectedIds.length > 0 && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 shadow-sm rounded-r flex flex-col md:flex-row justify-between items-center animate-pulse gap-3">
                            <div className="font-bold text-indigo-700">{selectedIds.length} Siswa Dipilih.</div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={() => handleBulkAction('Tinggal Kelas')} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-yellow-600">Set "Tinggal Kelas"</button>
                                <button onClick={() => handleBulkAction('Aktif')} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700">Set "Naik Kelas"</button>
                                <div className="w-px bg-indigo-200 mx-1 hidden md:block"></div>
                                <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-700">Hapus Terpilih</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">

                        {/* --- TOP HEADER: SEARCH, FILTER, & BUTTONS --- */}
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                            <div className="flex flex-col">
                                <span className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Siswa</span>
                                <span className="text-sm text-gray-500">Total: {totalItems} Siswa</span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-start md:items-center">

                                {/* KELOMPOK PENCARIAN & FILTER */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Cari Nama / NISN..."
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
                                            value={filterKelas}
                                            onChange={(e) => handleFilterChange('kelas', e.target.value)}
                                        >
                                            <option value="">Semua Kelas</option>
                                            <option value="10">Kelas 10</option>
                                            <option value="11">Kelas 11</option>
                                            <option value="12">Kelas 12</option>
                                        </select>
                                        <select
                                            className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-2/3 sm:w-auto max-w-[200px] text-gray-600 font-medium cursor-pointer"
                                            value={filterJurusan}
                                            onChange={(e) => handleFilterChange('jurusan', e.target.value)}
                                        >
                                            <option value="">Semua Jurusan</option>
                                            {jurusans.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* KELOMPOK TOMBOL AKSI */}
                                <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end md:ml-2">
                                    <SecondaryButton onClick={() => setIsImportModalOpen(true)}>Import Excel</SecondaryButton>
                                    <PrimaryButton onClick={() => openModal()}>+ Tambah</PrimaryButton>
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
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">NISN</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nama Siswa</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Kelas</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Jurusan</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Status Kenaikan</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">Sedang memuat data...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">Belum ada data siswa sesuai filter.</td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm cursor-pointer" checked={selectedIds.includes(item.id)} onChange={() => handleSelectRow(item.id)} />
                                                </td>
                                                <td className="px-6 py-4"><span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{item.username}</span></td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.kelas_saat_ini === '12' ? 'bg-purple-100 text-purple-700' : item.kelas_saat_ini === '11' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                        {item.kelas_saat_ini}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{item.jurusan_nama}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {item.status_akhir_periode_ini === 'Tinggal Kelas' ?
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Tinggal Kelas</span> :
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Akan Naik</span>
                                                    }
                                                </td>
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
                                            {/* Tombol Prev */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                            >
                                                <span className="sr-only">Previous</span>
                                                &larr; Prev
                                            </button>

                                            {/* Deretan Angka & Elipsis */}
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

                                            {/* Tombol Next */}
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

            {/* MODAL INPUT MANUAL */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-lg font-bold mb-4">{isEditMode ? 'Edit Siswa' : 'Tambah Siswa'}</h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="NISN" required />
                            <TextInput value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full" required />
                        </div>
                        <div>
                            <InputLabel value="Nama" required />
                            <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel value="Kelas" required />
                                <select value={form.kelas} onChange={e => setForm({ ...form, kelas: e.target.value })} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="10">10</option>
                                    <option value="11">11</option>
                                    <option value="12">12</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Jurusan" required />
                                <select value={form.jurusan_id} onChange={e => setForm({ ...form, jurusan_id: e.target.value })} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Pilih</option>
                                    {/* BUG FIX: j.nama -> j.nama_jurusan */}
                                    {jurusans.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                        </div>

                        {isEditMode && (
                            <div className="pt-2">
                                <label className="flex items-center space-x-2">
                                    <Checkbox checked={form.reset_password} onChange={e => setForm({ ...form, reset_password: e.target.checked })} />
                                    <span className="text-sm text-gray-600">Reset Password (ke 123456)</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <SecondaryButton onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing}>{processing ? 'Simpan...' : 'Simpan'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL IMPORT EXCEL */}
            <Modal show={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleImportSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">Import Data Siswa</h2>
                        <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex justify-between items-center">
                            <span>Gunakan template Excel yang sesuai.</span>
                            <a href="/api/admin/siswa/template" className="font-bold hover:underline flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Template
                            </a>
                        </div>

                        <div className="mb-4 flex gap-2 items-end">
                            <div className="w-full">
                                <InputLabel value="Pilih File Excel (.xlsx / .xls)" />
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
                                    onChange={(e) => {
                                        setImportFile(e.target.files ? e.target.files[0] : null);
                                        setPreviewData([]);
                                    }}
                                />
                            </div>
                            <SecondaryButton type="button" onClick={handlePreview} disabled={isLoadingPreview || !importFile} className="mb-0.5 h-10">
                                {isLoadingPreview ? "Loading..." : "Preview"}
                            </SecondaryButton>
                        </div>

                        {previewData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b font-bold text-sm text-gray-700">Preview Data ({previewData.length} Baris)</div>
                                <div className="overflow-x-auto max-h-60">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NISN</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jurusan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.map((row, idx) => (
                                                <tr key={idx} className={!row.is_jurusan_valid ? 'bg-red-50' : ''}>
                                                    <td className="px-4 py-2 text-sm text-gray-900 font-mono">{row.nisn}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.nama}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.kelas}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.jurusan}</td>
                                                    <td className="px-4 py-2 text-xs">
                                                        {row.is_jurusan_valid ?
                                                            <span className="text-green-600 font-bold">Valid</span> :
                                                            <span className="text-red-600 font-bold">Jurusan Salah</span>
                                                        }
                                                    </td>
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
                        <PrimaryButton disabled={processing || !importFile || previewData.length === 0}>
                            {processing ? "Mengimport..." : "Import Sekarang"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}