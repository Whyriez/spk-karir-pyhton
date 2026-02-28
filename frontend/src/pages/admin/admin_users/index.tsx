import { useEffect, useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import apiClient from '@/lib/axios';
import Header from "@/components/Header";
import Checkbox from "@/components/Checkbox";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

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

interface AdminUser {
    id: number;
    username: string;
    name: string;
}

export default function AdminUsersIndex() {
    const [data, setData] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Form State
    const initialForm = {
        id: null,
        username: '',
        name: '',
        reset_password: false
    };
    const [form, setForm] = useState(initialForm);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/admin/users');
            setData(res.data.data);
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

    // Pencarian Instan (Client-Side)
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const term = searchTerm.toLowerCase();
        return data.filter(item => 
            item.name.toLowerCase().includes(term) || 
            item.username.toLowerCase().includes(term)
        );
    }, [data, searchTerm]);

    const openModal = (item: any = null) => {
        setProcessing(false);
        setErrors({});

        if (item) {
            setIsEditMode(true);
            setForm({
                ...initialForm,
                ...item,
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
            newErrors.username = 'ID Login / Username wajib diisi.';
            isValid = false;
        }
        if (!form.name.trim()) {
            newErrors.name = 'Nama lengkap wajib diisi.';
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
            if (isEditMode && form.id) {
                await apiClient.put(`/admin/users/${form.id}`, form);
                Toast.fire({ icon: 'success', title: 'Data admin diperbarui!' });
            } else {
                await apiClient.post('/admin/users', form);
                Toast.fire({ icon: 'success', title: 'Admin baru ditambahkan!' });
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            const msg = err.response?.data?.msg || 'Terjadi kesalahan saat menyimpan.';
            MySwal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = (id: number) => {
        MySwal.fire({
            title: 'Hapus Admin?',
            text: "Akses login admin ini akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/admin/users/${id}`);
                    fetchData();
                    Toast.fire({ icon: 'success', title: 'Admin berhasil dihapus.' });
                } catch (err: any) {
                    const msg = err.response?.data?.msg || 'Terjadi kesalahan saat menghapus data.';
                    MySwal.fire('Gagal!', msg, 'error');
                }
            }
        });
    };

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Akun Admin</h2>
                </div>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* INFO BOX */}
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 shadow-sm rounded-r-md">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-indigo-700">
                                    <strong>Gunakan fitur ini dengan bijak.</strong> Akun yang didaftarkan di sini memiliki hak akses 100% terhadap sistem, termasuk Manajemen Siswa, Alumni, dan Konfigurasi BWM. Anda dapat membuatkan akun untuk staf BKK atau Tata Usaha.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        {/* --- TOP HEADER --- */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                            <div className="flex flex-col">
                                <span className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Admin</span>
                                <span className="text-sm text-gray-500">Total: {filteredData.length} Admin</span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <TextInput
                                    type="text"
                                    placeholder="Cari nama atau username..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 text-sm"
                                />
                                <PrimaryButton onClick={() => openModal()} className="w-full sm:w-auto justify-center">
                                    + Tambah Admin
                                </PrimaryButton>
                            </div>
                        </div>

                        {/* --- TABEL DATA --- */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">No</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID Login (Username)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Sedang memuat data...</td></tr>
                                    ) : filteredData.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Belum ada data admin sesuai pencarian.</td></tr>
                                    ) : (
                                        filteredData.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-gray-900">{item.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded font-bold border border-gray-200">
                                                        {item.username}
                                                    </span>
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

            {/* MODAL FORM */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">
                            {isEditMode ? 'Edit Data Admin' : 'Tambah Admin Baru'}
                        </h2>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Nama Lengkap" required />
                                <TextInput
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className={`w-full mt-1 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Nama Lengkap"
                                    autoFocus
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <InputLabel value="Username / ID Login" required />
                                <TextInput
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    className={`w-full mt-1 ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Contoh: admin_bkk"
                                />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>

                            {isEditMode && (
                                <div className="pt-2 bg-yellow-50 p-3 rounded border border-yellow-200">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox checked={form.reset_password} onChange={e => setForm({ ...form, reset_password: e.target.checked })} />
                                        <div className="text-sm text-yellow-800">
                                            <strong>Reset Password?</strong>
                                            <p className="text-xs text-yellow-600">Password akan dikembalikan ke default (123456).</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {processing ? 'Menyimpan...' : 'Simpan Admin'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}