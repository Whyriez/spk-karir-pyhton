import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import Checkbox from '@/components/Checkbox';
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

interface Siswa {
    id: number;
    username: string;
    name: string;
    kelas_saat_ini: string;
    jurusan_nama: string;
    jurusan_id?: number;
}

interface Jurusan {
    id: number;
    nama: string;
}

export default function AdminSiswaIndex() {
    const [data, setData] = useState<Siswa[]>([]);
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
        username: '', // NISN
        name: '',
        kelas: '10', // Default Kelas 10
        jurusan_id: '',
        reset_password: false
    };
    const [form, setForm] = useState(initialForm);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSiswa, resJurusan] = await Promise.all([
                apiClient.get('/admin/siswa'),
                apiClient.get('/jurusan')
            ]);
            setData(resSiswa.data.data);
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

    const openModal = (item: any = null) => {
        setProcessing(false);
        setErrors({}); // Reset error

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

    const validateForm = () => {
        let newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!form.username.trim()) {
            newErrors.username = 'NISN wajib diisi.';
            isValid = false;
        }
        if (!form.name.trim()) {
            newErrors.name = 'Nama siswa wajib diisi.';
            isValid = false;
        }
        if (!form.jurusan_id) {
            newErrors.jurusan_id = 'Jurusan wajib dipilih.';
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
                await apiClient.put(`/admin/siswa/${form.id}`, form);
                Toast.fire({icon: 'success', title: 'Data siswa diperbarui!'});
            } else {
                await apiClient.post('/admin/siswa', form);
                Toast.fire({icon: 'success', title: 'Siswa berhasil ditambahkan!'});
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.msg || 'Terjadi kesalahan saat menyimpan.';
            MySwal.fire({icon: 'error', title: 'Gagal', text: msg});
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = (id: number) => {
        MySwal.fire({
            title: 'Hapus Siswa?',
            text: "Menghapus siswa juga akan menghapus riwayat nilai dan rekomendasi mereka secara permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/admin/siswa/${id}`);
                    fetchData();
                    Toast.fire({icon: 'success', title: 'Siswa berhasil dihapus.'});
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
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Data Siswa</h2>

                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Siswa</div>

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
                                    + Tambah Siswa
                                </PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">NISN</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama
                                        Siswa
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Kelas</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jurusan</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">Sedang memuat
                                            data...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data
                                            siswa.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                    <span
                                                        className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                        {item.username}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                        item.kelas_saat_ini === '12' ? 'bg-purple-100 text-purple-700' :
                                                            item.kelas_saat_ini === '11' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                        Kelas {item.kelas_saat_ini || '?'}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{item.jurusan_nama}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
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

            {/* MODAL FORM */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER (Sticky) */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
                        <h2 className="text-lg font-bold text-gray-800">
                            {isEditMode ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                        </h2>
                        <button type="button" onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* CONTENT (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="NISN" required/>
                                <TextInput
                                    value={form.username}
                                    onChange={e => setForm({...form, username: e.target.value})}
                                    className={`w-full mt-1 font-mono ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Nomor Induk Siswa Nasional"
                                    required
                                />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>

                            <div>
                                <InputLabel value="Nama Lengkap" required/>
                                <TextInput
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    className={`w-full mt-1 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="Nama Siswa"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Kelas" required/>
                                    <select
                                        className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        value={form.kelas}
                                        onChange={e => setForm({...form, kelas: e.target.value})}
                                        required
                                    >
                                        <option value="10">Kelas 10</option>
                                        <option value="11">Kelas 11</option>
                                        <option value="12">Kelas 12</option>
                                    </select>
                                </div>

                                <div>
                                    <InputLabel value="Jurusan" required/>
                                    <select
                                        className={`w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm ${errors.jurusan_id ? 'border-red-500' : ''}`}
                                        value={form.jurusan_id}
                                        onChange={e => setForm({...form, jurusan_id: e.target.value})}
                                        required
                                    >
                                        <option value="">-- Pilih --</option>
                                        {jurusans.map(j => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                    {errors.jurusan_id &&
                                        <p className="text-red-500 text-xs mt-1">{errors.jurusan_id}</p>}
                                </div>
                            </div>

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
                                                (123456).</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FOOTER (Sticky) */}
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {processing ? 'Menyimpan...' : 'Simpan Data'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}