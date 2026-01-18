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
    nama_jurusan: string;
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

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSiswa, resJurusan] = await Promise.all([
                apiClient.get('/admin/siswa'),
                apiClient.get('/jurusan')
            ]);
            setData(resSiswa.data.data);
            setJurusans(resJurusan.data.data);
            setSelectedIds([]); // Reset selection
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
        setErrors({});
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

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Data Siswa</h2>
                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* TOOLBAR BULK ACTION */}
                    {selectedIds.length > 0 && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 shadow-sm rounded-r flex justify-between items-center animate-pulse">
                            <div className="font-bold text-indigo-700">{selectedIds.length} Siswa Dipilih.</div>
                            <div className="flex gap-2">
                                <button onClick={() => handleBulkAction('Tinggal Kelas')} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-700">Set "Tinggal Kelas"</button>
                                <button onClick={() => handleBulkAction('Aktif')} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700">Set "Naik Kelas"</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Siswa</div>
                            <div className="flex gap-2">
                                <SecondaryButton onClick={() => setIsImportModalOpen(true)}>Import Excel</SecondaryButton>
                                <PrimaryButton onClick={() => openModal()}>+ Tambah Siswa</PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm" onChange={handleSelectAll} checked={data.length > 0 && selectedIds.length === data.length} />
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
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">Belum ada data siswa.</td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm" checked={selectedIds.includes(item.id)} onChange={() => handleSelectRow(item.id)} />
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
                            <TextInput value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full" required />
                        </div>
                        <div>
                            <InputLabel value="Nama" required />
                            <TextInput value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel value="Kelas" required />
                                <select value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="10">10</option>
                                    <option value="11">11</option>
                                    <option value="12">12</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Jurusan" required />
                                <select value={form.jurusan_id} onChange={e => setForm({...form, jurusan_id: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Pilih</option>
                                    {jurusans.map(j => <option key={j.id} value={j.id}>{j.nama_jurusan}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        {isEditMode && (
                            <div className="pt-2">
                                <label className="flex items-center space-x-2">
                                    <Checkbox checked={form.reset_password} onChange={e => setForm({...form, reset_password: e.target.checked})} />
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
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
                        <h2 className="text-lg font-bold text-gray-900">Import Data Siswa</h2>
                        <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ALERT TEMPLATE */}
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex justify-between items-center">
                            <span>Gunakan template Excel yang sesuai.</span>
                            <a href="/api/admin/siswa/template" className="font-bold hover:underline flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
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

                        {/* PREVIEW TABLE */}
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

                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
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