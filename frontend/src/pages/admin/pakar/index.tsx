import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import apiClient from '@/lib/axios';
import Header from "../../../components/Header.tsx";
import Checkbox from "../../../components/Checkbox.tsx";
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

interface Pakar {
    id: number;
    username: string;
    name: string;
    jenis_pakar: string;
    jurusan_id?: number | null;
    jurusan?: { id: number, nama: string } | null;
}

interface Jurusan {
    id: number;
    nama: string;
}

export default function PakarIndex() {
    const [data, setData] = useState<Pakar[]>([]);
    const [jurusans, setJurusans] = useState<Jurusan[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Validasi State
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Form State
    const initialForm = {
        id: null,
        username: '',
        name: '',
        jenis_pakar: 'gurubk', // Default
        jurusan_id: '',
        reset_password: false
    };
    const [form, setForm] = useState(initialForm);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resPakar, resJurusan] = await Promise.all([
                apiClient.get('/admin/pakar'),
                apiClient.get('/jurusan')
            ]);
            setData(resPakar.data.data);
            setJurusans(resJurusan.data.data);
        } catch (err) {
            console.error(err);
            Toast.fire({icon: 'error', title: 'Gagal memuat data.'});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const openModal = (item: any = null) => {
        setProcessing(false);
        setErrors({}); // Reset error

        if (item) {
            setIsEditMode(true);
            setForm({
                ...initialForm,
                ...item,
                jurusan_id: item.jurusan_id || '',
                reset_password: false
            });
        } else {
            setIsEditMode(false);
            setForm(initialForm);
        }
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!form.username.trim()) {
            newErrors.username = 'ID Login / NIP wajib diisi.';
            isValid = false;
        }
        if (!form.name.trim()) {
            newErrors.name = 'Nama lengkap wajib diisi.';
            isValid = false;
        }

        // Validasi Kondisional: Jurusan Wajib jika Kaprodi
        if (form.jenis_pakar === 'kaprodi' && !form.jurusan_id) {
            newErrors.jurusan_id = 'Kaprodi wajib memilih jurusan.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setProcessing(true);

        const payload = {
            ...form,
            jurusan_id: form.jenis_pakar === 'kaprodi' ? form.jurusan_id : null
        };

        try {
            if (isEditMode && form.id) {
                await apiClient.put(`/admin/pakar/${form.id}`, payload);
                Toast.fire({icon: 'success', title: 'Data pakar diperbarui!'});
            } else {
                await apiClient.post('/admin/pakar', payload);
                Toast.fire({icon: 'success', title: 'Pakar baru ditambahkan!'});
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            const msg = err.response?.data?.msg || 'Terjadi kesalahan saat menyimpan.';
            MySwal.fire({icon: 'error', title: 'Gagal', text: msg});
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = (id: number) => {
        MySwal.fire({
            title: 'Hapus Pakar?',
            text: "Akses login pakar ini akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/admin/pakar/${id}`);
                    fetchData();
                    Toast.fire({icon: 'success', title: 'Pakar berhasil dihapus.'});
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
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Pakar</h2>

                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Pakar</div>

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
                                    + Tambah Pakar
                                </PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama
                                        & NIP
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jenis
                                        Pakar
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jurusan
                                        (Kaprodi)
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">Sedang memuat
                                            data...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">Belum ada data
                                            pakar.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-gray-900">{item.name}</div>
                                                <div
                                                    className="text-xs font-mono text-gray-500 bg-gray-100 inline-block px-1 rounded mt-1">
                                                    {item.username}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                    <span
                                                        className={`px-2.5 py-1 text-xs rounded-full font-bold border ${
                                                            item.jenis_pakar === 'gurubk'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                        {item.jenis_pakar === 'gurubk' ? 'Guru BK' : 'Kaprodi'}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-sm">
                                                {item.jenis_pakar === 'kaprodi' ? (
                                                    <span
                                                        className="font-semibold text-gray-700">{item.jurusan?.nama || '-'}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Semua Jurusan</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium align-top">
                                                <button onClick={() => openModal(item)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-bold mr-4">Edit
                                                </button>
                                                <button onClick={() => handleDelete(item.id)}
                                                        className="text-red-600 hover:text-red-900">Hapus
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

            {/* MODAL FORM (Sticky) */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
                        <h2 className="text-lg font-bold text-gray-900">
                            {isEditMode ? 'Edit Data Pakar' : 'Tambah Pakar Baru'}
                        </h2>
                        <button type="button" onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Login ID / NIP" required/>
                                <TextInput
                                    value={form.username}
                                    onChange={e => setForm({...form, username: e.target.value})}
                                    className={`w-full mt-1 ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="NIP atau Username"
                                />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>

                            <div>
                                <InputLabel value="Nama Lengkap" required/>
                                <TextInput
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    className={`w-full mt-1 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Nama Lengkap Pakar"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <InputLabel value="Jenis Pakar" required/>
                                <select
                                    value={form.jenis_pakar}
                                    onChange={e => setForm({...form, jenis_pakar: e.target.value})}
                                    className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="gurubk">Guru BK (Umum)</option>
                                    <option value="kaprodi">Kaprodi (Spesifik Jurusan)</option>
                                </select>
                            </div>

                            {/* Dropdown Jurusan - Hanya Muncul Jika Kaprodi */}
                            {form.jenis_pakar === 'kaprodi' && (
                                <div
                                    className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 animate-fade-in-down">
                                    <InputLabel value="Pilih Jurusan yang Diampu" className="text-emerald-800 font-bold"
                                                required/>
                                    <select
                                        value={form.jurusan_id}
                                        onChange={e => setForm({...form, jurusan_id: e.target.value})}
                                        className={`w-full mt-1 border-emerald-300 rounded-md shadow-sm text-sm focus:ring-emerald-500 ${errors.jurusan_id ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">-- Pilih Jurusan --</option>
                                        {jurusans.map(j => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                    {errors.jurusan_id &&
                                        <p className="text-red-500 text-xs mt-1">{errors.jurusan_id}</p>}
                                    <p className="text-xs text-emerald-600 mt-1">Kaprodi hanya dapat memvalidasi nilai
                                        untuk jurusan ini.</p>
                                </div>
                            )}

                            {isEditMode && (
                                <div className="pt-2 bg-yellow-50 p-3 rounded border border-yellow-200">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox
                                            checked={form.reset_password}
                                            onChange={e => setForm({...form, reset_password: e.target.checked})}
                                        />
                                        <div className="text-sm text-yellow-800">
                                            <strong>Reset Password?</strong>
                                            <p className="text-xs text-yellow-600">Password akan dikembalikan ke default
                                                (password123).</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {processing ? 'Menyimpan...' : 'Simpan Pakar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}