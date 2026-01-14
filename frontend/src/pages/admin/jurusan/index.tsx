import { useEffect, useState} from 'react';
import type { FormEvent } from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import InputLabel from '@/components/InputLabel';
import apiClient from "@/lib/axios";
import Header from "@/components/Header"; // Sesuaikan path import component Header
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
    const [data, setData] = useState<Jurusan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<{ id: number | null, kode: string, nama: string }>({ id: null, kode: '', nama: '' });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const fetchData = async () => {
        try {
            const res = await apiClient.get('/jurusan');
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Gagal memuat data jurusan.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                Toast.fire({ icon: 'success', title: 'Jurusan berhasil diperbarui!' });
            } else {
                await apiClient.post('/jurusan', form);
                Toast.fire({ icon: 'success', title: 'Jurusan berhasil ditambahkan!' });
            }

            setShowModal(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Gagal menyimpan data.';
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
                    Toast.fire({ icon: 'success', title: 'Jurusan berhasil dihapus.' });
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

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Jurusan</div>

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
                                    + Tambah Jurusan
                                </PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Kode</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Jurusan</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">Sedang memuat data...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">Belum ada data jurusan.</td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                    </div>
                </div>
            </div>

            {/* MODAL FORM */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="md">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER (Sticky) */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b bg-white">
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
                    <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
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