import { useEffect, useState} from 'react';
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

// Interface Data
interface Alumni {
    id: number;
    name: string;
    status: string;
    batch: string;
    major: string;
}

interface Meta {
    current_page: number;
    last_page: number;
    total: number;
    from: number;
}

// KOMPONEN PAGINATION
const SimplePagination = ({ meta, onPageChange }: { meta: Meta, onPageChange: (page: number) => void }) => {
    if (meta.last_page <= 1) return null;
    return (
        <div className="flex flex-wrap justify-center gap-1 mt-6">
            <button
                disabled={meta.current_page === 1}
                onClick={() => onPageChange(meta.current_page - 1)}
                className={`px-4 py-2 text-sm border rounded ${meta.current_page === 1 ? 'text-gray-400' : 'bg-white hover:bg-gray-50'}`}
            >
                &laquo; Previous
            </button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-4 py-2 text-sm border rounded ${page === meta.current_page ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    {page}
                </button>
            ))}
            <button
                disabled={meta.current_page === meta.last_page}
                onClick={() => onPageChange(meta.current_page + 1)}
                className={`px-4 py-2 text-sm border rounded ${meta.current_page === meta.last_page ? 'text-gray-400' : 'bg-white hover:bg-gray-50'}`}
            >
                Next &raquo;
            </button>
        </div>
    );
};

export default function AlumniIndex() {
    // --- STATE UTAMA ---
    const [data, setData] = useState<Alumni[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Form Data
    const [form, setForm] = useState({ id: 0, name: '', status: '', batch: '', major: '' });

    // --- FETCH DATA ---
    const fetchData = async (page = 1, search = searchTerm) => {
        setLoading(true);
        try {
            const response = await apiClient.get('/alumni', {
                params: { page, search }
            });
            setData(response.data.data);
            setMeta(response.data.meta);
            setSelectedIds([]);
        } catch (error) {
            console.error("Error fetching alumni:", error);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchData(1, searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // --- HANDLERS SELECTION ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = data.map(item => item.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const executeBulkDelete = async () => {
        MySwal.fire({
            title: `Hapus ${selectedIds.length} data?`,
            text: "Data yang dihapus tidak dapat dikembalikan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus Semua!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.post('/alumni/bulk-destroy', { ids: selectedIds });
                    fetchData(meta?.current_page);
                    setSelectedIds([]);
                    Toast.fire({ icon: 'success', title: 'Data berhasil dihapus.' });
                } catch (error) {
                    MySwal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                }
            }
        });
    };

    // --- HANDLERS CRUD ---
    const openModal = (item: Alumni | null = null) => {
        setErrors({}); // Reset error
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
                Toast.fire({ icon: 'success', title: 'Data alumni diperbarui!' });
            } else {
                await apiClient.post('/alumni', form);
                Toast.fire({ icon: 'success', title: 'Data alumni ditambahkan!' });
            }
            setIsModalOpen(false);
            fetchData(meta?.current_page);
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat menyimpan data.' });
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
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/alumni/${id}`);
                    fetchData(meta?.current_page);
                    Toast.fire({ icon: 'success', title: 'Data berhasil dihapus.' });
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
            Toast.fire({ icon: 'success', title: 'Preview berhasil dimuat.' });
        } catch (e) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file Excel. Pastikan format sesuai.' });
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
            await apiClient.post('/alumni/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsImportModalOpen(false);
            setImportFile(null);
            setPreviewData([]);
            fetchData();
            MySwal.fire({ icon: 'success', title: 'Berhasil', text: 'Data alumni berhasil diimport!' });
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Gagal Import', text: 'Terjadi kesalahan saat mengimport data.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Data Alumni</h2>
            </Header>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border border-gray-200">

                        {/* HEADER & ACTIONS */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Alumni</div>
                                <TextInput
                                    type="text"
                                    placeholder="Cari nama, jurusan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 text-sm"
                                />
                                {selectedIds.length > 0 && (
                                    <DangerButton onClick={executeBulkDelete} className="text-xs whitespace-nowrap">
                                        Hapus ({selectedIds.length}) Data
                                    </DangerButton>
                                )}
                            </div>

                            <div className="flex gap-2 w-full md:w-auto justify-end">
                                <SecondaryButton onClick={() => setIsImportModalOpen(true)}>Import Excel</SecondaryButton>
                                <PrimaryButton onClick={() => openModal(null)}>+ Tambah</PrimaryButton>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                                onChange={handleSelectAll}
                                                checked={data.length > 0 && selectedIds.length === data.length}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Angkatan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jurusan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Memuat data...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data alumni.</td></tr>
                                    ) : (
                                        data.map((alumni, index) => (
                                            <tr key={alumni.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(alumni.id) ? "bg-indigo-50" : ""}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                                        checked={selectedIds.includes(alumni.id)}
                                                        onChange={() => handleSelectOne(alumni.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {meta ? (meta.current_page - 1) * 10 + index + 1 : index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{alumni.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.batch}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.major}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase border border-gray-300">
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

                        {/* PAGINATION */}
                        {meta && <SimplePagination meta={meta} onPageChange={(page) => fetchData(page)} />}
                    </div>
                </div>
            </div>

            {/* MODAL FORM CRUD (Sticky) */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
                        <h2 className="text-lg font-bold text-gray-900">
                            {isEditMode ? "Edit Data Alumni" : "Tambah Alumni Baru"}
                        </h2>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Nama Lengkap" required />
                                <TextInput
                                    className={`mt-1 block w-full ${errors.name ? 'border-red-500' : ''}`}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Nama Lengkap"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Angkatan" required />
                                    <TextInput
                                        type="number"
                                        className={`mt-1 block w-full ${errors.batch ? 'border-red-500' : ''}`}
                                        value={form.batch}
                                        onChange={(e) => setForm({ ...form, batch: e.target.value })}
                                        placeholder="2023"
                                    />
                                    {errors.batch && <p className="text-red-500 text-xs mt-1">{errors.batch}</p>}
                                </div>
                                <div>
                                    <InputLabel value="Jurusan" required />
                                    <TextInput
                                        className={`mt-1 block w-full ${errors.major ? 'border-red-500' : ''}`}
                                        value={form.major}
                                        onChange={(e) => setForm({ ...form, major: e.target.value })}
                                        placeholder="TKJ"
                                    />
                                    {errors.major && <p className="text-red-500 text-xs mt-1">{errors.major}</p>}
                                </div>
                            </div>

                            <div>
                                <InputLabel value="Status Saat Ini" required />
                                <TextInput
                                    className={`mt-1 block w-full ${errors.status ? 'border-red-500' : ''}`}
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    placeholder="Contoh: Kuliah di UNSRAT / Bekerja di PT. Maju / Wirausaha"
                                />
                                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan Data'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL IMPORT EXCEL (Sticky) */}
            <Modal show={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleImportSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
                        <h2 className="text-lg font-bold text-gray-900">Import Data Alumni</h2>
                        <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <span>Gunakan format Excel yang sesuai.</span>
                            <a href="/api/alumni/template" className="flex items-center gap-1 font-bold hover:underline text-blue-700 whitespace-nowrap">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                                Download Template
                            </a>
                        </div>

                        <div className="mb-4 flex gap-2 items-end">
                            <div className="w-full">
                                <InputLabel value="Pilih File Excel" />
                                <input
                                    type="file"
                                    className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
                                    onChange={(e) => {
                                        setImportFile(e.target.files ? e.target.files[0] : null);
                                        setPreviewData([]);
                                    }}
                                    accept=".xlsx, .xls, .csv"
                                />
                            </div>
                            <SecondaryButton type="button" onClick={handlePreview} disabled={isLoadingPreview || !importFile} className="mb-0.5 h-10">
                                {isLoadingPreview ? "Loading..." : "Preview"}
                            </SecondaryButton>
                        </div>

                        {/* PREVIEW TABLE */}
                        {previewData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b font-bold text-sm text-gray-700">
                                    Preview Data ({previewData.length} Baris)
                                </div>
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

                    {/* FOOTER */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
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