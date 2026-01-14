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

// Tipe Option Select
interface SelectOption {
    val: number;
    label: string;
}

// Tipe Data Kriteria
interface Kriteria {
    id: number;
    kode: string;
    nama: string;
    atribut: string;
    kategori: string;
    tipe_input: string;
    sumber_nilai: string;
    penanggung_jawab: string;
    tampil_di_siswa: boolean;
    target_jalur: string;
    skala_maks: number;
    jalur_reverse: string | null;
    opsi_pilihan?: SelectOption[] | string;
}

export default function KriteriaIndex() {
    const [data, setData] = useState<Kriteria[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [processing, setProcessing] = useState(false);

    // State Validasi Error
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const initialForm = {
        id: null,
        kode: '',
        nama: '',
        atribut: 'benefit',
        kategori: 'kuesioner',
        tipe_input: 'likert',
        sumber_nilai: 'input_siswa',
        penanggung_jawab: 'gurubk',
        tampil_di_siswa: true,
        target_jalur: 'all',
        skala_maks: 5,
        jalur_reverse: ''
    };

    const [form, setForm] = useState(initialForm);
    const [selectOptions, setSelectOptions] = useState<SelectOption[]>([]);
    const [targets, setTargets] = useState({
        studi: true,
        kerja: true,
        wirausaha: true
    });

    const fetchData = async () => {
        try {
            const res = await apiClient.get('/kriteria');
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            Toast.fire({icon: 'error', title: 'Gagal memuat data kriteria.'});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Sinkronisasi Target Jalur
    useEffect(() => {
        const active = [];
        if (targets.studi) active.push('studi');
        if (targets.kerja) active.push('kerja');
        if (targets.wirausaha) active.push('wirausaha');
        const val = (active.length === 3) ? 'all' : active.join(',');
        setForm(f => ({...f, target_jalur: val}));
    }, [targets]);

    const openModal = (item: any = null) => {
        setProcessing(false);
        setErrors({}); // Reset error saat modal dibuka

        if (item) {
            setIsEditMode(true);
            setForm({
                ...initialForm,
                ...item,
                jalur_reverse: item.jalur_reverse || '',
                skala_maks: item.tipe_input === 'likert' ? 5 : item.skala_maks
            });

            // Load opsi pilihan
            let loadedOpts: SelectOption[] = [];
            if (item.tipe_input === 'select' && item.opsi_pilihan) {
                if (Array.isArray(item.opsi_pilihan)) {
                    loadedOpts = item.opsi_pilihan;
                } else if (typeof item.opsi_pilihan === 'string') {
                    try {
                        const parsed = JSON.parse(item.opsi_pilihan);
                        if (Array.isArray(parsed)) loadedOpts = parsed;
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
            setSelectOptions(loadedOpts);

            const t = item.target_jalur || 'all';
            setTargets({
                studi: t.includes('all') || t.includes('studi'),
                kerja: t.includes('all') || t.includes('kerja'),
                wirausaha: t.includes('all') || t.includes('wirausaha'),
            });
        } else {
            setIsEditMode(false);
            setForm(initialForm);
            setSelectOptions([]);
            setTargets({studi: true, kerja: true, wirausaha: true});
        }
        setIsModalOpen(true);
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        let newMax = form.skala_maks;
        if (val === 'likert') {
            newMax = 5;
        } else if (val === 'number' && form.tipe_input === 'likert') {
            newMax = 100;
        }
        setForm({...form, tipe_input: val, skala_maks: newMax});
    };

    // --- VALIDASI OPSI ---
    const addOption = () => {
        const nextVal = selectOptions.length + 1;
        if (nextVal > form.skala_maks) {
            MySwal.fire({
                icon: 'warning',
                title: 'Batas Maksimum Tercapai',
                text: `Tidak dapat menambah opsi karena melebihi Skala Maksimal (${form.skala_maks}).`
            });
            return;
        }
        setSelectOptions([...selectOptions, {val: nextVal, label: ''}]);
    };

    const removeOption = (index: number) => {
        setSelectOptions(selectOptions.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, field: 'val' | 'label', value: string | number) => {
        if (field === 'val') {
            const numVal = Number(value);
            if (numVal > form.skala_maks) {
                // Optional: Toast warning jika user input manual angka kegedean
                return;
            }
        }
        const newOpts = [...selectOptions];
        newOpts[index] = {...newOpts[index], [field]: value};
        setSelectOptions(newOpts);
    };

    const validateForm = () => {
        let newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!form.kode.trim()) newErrors.kode = 'Kode kriteria wajib diisi.';
        if (!form.nama.trim()) newErrors.nama = 'Nama kriteria wajib diisi.';

        if (form.tipe_input === 'select') {
            const invalidOpts = selectOptions.filter(o => o.val > form.skala_maks);
            if (invalidOpts.length > 0) {
                newErrors.general = 'Terdapat nilai opsi yang melebihi skala maksimal.';
                isValid = false;
            }
            if (selectOptions.length === 0) {
                newErrors.general = 'Opsi pilihan minimal harus ada satu.';
                isValid = false;
            }
            if (selectOptions.some(o => !o.label.trim())) {
                newErrors.general = 'Label opsi tidak boleh kosong.';
                isValid = false;
            }
        }

        // Cek target jalur minimal 1
        if (!targets.studi && !targets.kerja && !targets.wirausaha) {
            newErrors.general = 'Pilih minimal satu target jalur karir.';
            isValid = false;
        }

        setErrors(newErrors);

        // Jika ada error general, munculkan alert
        if (!isValid && newErrors.general) {
            MySwal.fire({
                icon: 'error',
                title: 'Validasi Gagal',
                text: newErrors.general
            });
        }

        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        let payload = {...form};
        const {list_pertanyaan, ...cleanForm} = form as any;

        if (form.tipe_input === 'likert') {
            payload.skala_maks = 5;
        }

        const finalPayload = {
            ...cleanForm,
            skala_maks: form.tipe_input === 'likert' ? 5 : form.skala_maks,
            opsi_pilihan: form.tipe_input === 'select' ? selectOptions : null
        };

        setProcessing(true);
        try {
            if (isEditMode && form.id) {
                await apiClient.put(`/kriteria/${form.id}`, finalPayload);
                Toast.fire({icon: 'success', title: 'Kriteria berhasil diperbarui!'});
            } else {
                await apiClient.post('/kriteria', finalPayload);
                Toast.fire({icon: 'success', title: 'Kriteria berhasil ditambahkan!'});
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';
            MySwal.fire({icon: 'error', title: 'Gagal Menyimpan', text: msg});
        } finally {
            setProcessing(false);
        }
    };

    const confirmDelete = (id: number) => {
        MySwal.fire({
            title: 'Apakah Anda yakin?',
            text: "Data kriteria dan nilai siswa yang terkait akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/kriteria/${id}`);
                    fetchData();
                    Toast.fire({icon: 'success', title: 'Data telah dihapus.'});
                } catch (error) {
                    MySwal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                }
            }
        });
    };

    return (
        <div>
            <Header>
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Kriteria</h2>

                </div>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 p-6">
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="text-gray-900 font-bold text-lg whitespace-nowrap">Daftar Kriteria</div>

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
                                    + Tambah Kriteria Baru
                                </PrimaryButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Kode</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama
                                        Kriteria
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jalur
                                        Karir
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe</th>
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
                                        <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada kriteria
                                            yang dibuat.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                    <span
                                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700">
                                                        {item.kode}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-gray-900">{item.nama}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    PJ: <span
                                                    className="uppercase font-semibold">{item.penanggung_jawab === 'gurubk' ? 'Guru BK' : item.penanggung_jawab}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.target_jalur === 'all' ? (
                                                        <span
                                                            className="bg-emerald-100 text-emerald-800 text-[10px] uppercase px-2 py-1 rounded-full font-bold tracking-wide">
                                                                Semua Jalur
                                                            </span>
                                                    ) : (
                                                        item.target_jalur.split(',').map(t => (
                                                            <span key={t}
                                                                  className="bg-gray-100 text-gray-600 text-[10px] uppercase px-2 py-1 rounded-full border border-gray-300 font-medium">
                                                                    {t}
                                                                </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center align-top">
                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                        {item.tipe_input}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium align-top">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => openModal(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 font-bold">Edit
                                                    </button>
                                                    <button onClick={() => confirmDelete(item.id)}
                                                            className="text-red-600 hover:text-red-900">Hapus
                                                    </button>
                                                </div>
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

            {/* --- MODAL FORM --- */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

                    {/* HEADER */}
                    <div className="flex-none flex items-center justify-between px-8 py-5 border-b bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Edit Kriteria' : 'Tambah Kriteria Baru'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Silakan lengkapi informasi kriteria penilaian.</p>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 gap-8">

                            {/* Info Dasar */}
                            <div className="space-y-6">
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        1. Informasi Dasar
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-1">
                                                <InputLabel value="Kode" required/>
                                                <TextInput
                                                    value={form.kode}
                                                    onChange={e => setForm({...form, kode: e.target.value})}
                                                    className={`w-full mt-1 text-center font-bold uppercase bg-white ${errors.kode ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                                    placeholder="C1"
                                                    disabled={isEditMode}
                                                    required
                                                />
                                                {errors.kode &&
                                                    <p className="text-red-500 text-xs mt-1">{errors.kode}</p>}
                                            </div>
                                            <div className="col-span-3">
                                                <InputLabel value="Nama Kriteria" required/>
                                                <TextInput
                                                    value={form.nama}
                                                    onChange={e => setForm({...form, nama: e.target.value})}
                                                    className={`w-full mt-1 bg-white ${errors.nama ? 'border-red-500' : ''}`}
                                                    placeholder="Contoh: Penghasilan Orang Tua"
                                                    required
                                                />
                                                {errors.nama &&
                                                    <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <InputLabel value="Cara Input Data"/>
                                                <select
                                                    className="w-full mt-1 border-gray-300 rounded-lg shadow-sm text-sm bg-white"
                                                    value={form.tipe_input}
                                                    onChange={handleTypeChange}
                                                >
                                                    <option value="likert">Skala Likert (Sangat Setuju dll)</option>
                                                    <option value="number">Angka Langsung (0-100)</option>
                                                    <option value="select">Pilihan Dropdown (Select)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <InputLabel value="Siapa Penanggung Jawab?"/>
                                                <select
                                                    className="w-full mt-1 border-gray-300 rounded-lg shadow-sm text-sm bg-white"
                                                    value={form.penanggung_jawab}
                                                    onChange={e => setForm({...form, penanggung_jawab: e.target.value})}
                                                >
                                                    <option value="gurubk">Guru BK (Kuesioner)</option>
                                                    <option value="kaprodi">Kaprodi (Keahlian)</option>
                                                    <option value="umum">Umum (Data Sekolah)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Dynamic Options */}
                                        {form.tipe_input === 'select' && (
                                            <div className="mt-4 bg-white p-4 border border-gray-200 rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <InputLabel value="Opsi Pilihan (Label & Nilai)"
                                                                className="text-indigo-600"/>
                                                    <button type="button" onClick={addOption}
                                                            className="text-xs text-white bg-indigo-500 px-2 py-1 rounded hover:bg-indigo-600">
                                                        + Tambah Opsi
                                                    </button>
                                                </div>
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                    {selectOptions.map((opt, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <TextInput
                                                                type="number"
                                                                className="w-16 text-center text-sm"
                                                                placeholder="Val"
                                                                value={opt.val}
                                                                onChange={(e) => updateOption(idx, 'val', e.target.value)}
                                                            />
                                                            <TextInput
                                                                type="text"
                                                                className="flex-1 text-sm"
                                                                placeholder="Label"
                                                                value={opt.label}
                                                                onChange={(e) => updateOption(idx, 'label', e.target.value)}
                                                            />
                                                            <button type="button" onClick={() => removeOption(idx)}
                                                                    className="text-red-500 hover:text-red-700">x
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Logika Sistem */}
                            <div className="space-y-6">
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 h-full">
                                    <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        2. Pengaturan Sistem
                                    </h3>

                                    <div className="space-y-5">
                                        <div className="border-b border-emerald-200 pb-4">
                                            <InputLabel value="Sifat Nilai (Benefit/Cost)"
                                                        className="text-emerald-900 mb-1 block font-semibold"/>
                                            <select
                                                className="w-full mt-1 border-emerald-300 rounded-lg shadow-sm text-sm bg-white focus:ring-emerald-500"
                                                value={form.atribut}
                                                onChange={e => setForm({...form, atribut: e.target.value})}
                                            >
                                                <option value="benefit">Makin TINGGI nilainya, makin BAGUS (Benefit)
                                                </option>
                                                <option value="cost">Makin KECIL nilainya, makin BAGUS (Cost)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <InputLabel value="Kriteria ini dinilai untuk siapa?"
                                                        className="text-emerald-900 mb-2 block"/>
                                            <div
                                                className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <Checkbox checked={targets.studi} onChange={(e) => setTargets({
                                                        ...targets,
                                                        studi: e.target.checked
                                                    })}/>
                                                    <span
                                                        className="text-sm text-gray-700">Siswa yang ingin <b>Kuliah</b></span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <Checkbox checked={targets.kerja} onChange={(e) => setTargets({
                                                        ...targets,
                                                        kerja: e.target.checked
                                                    })}/>
                                                    <span
                                                        className="text-sm text-gray-700">Siswa yang ingin <b>Bekerja</b></span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <Checkbox checked={targets.wirausaha} onChange={(e) => setTargets({
                                                        ...targets,
                                                        wirausaha: e.target.checked
                                                    })}/>
                                                    <span
                                                        className="text-sm text-gray-700">Siswa yang ingin <b>Berwirausaha</b></span>
                                                </label>
                                            </div>
                                        </div>

                                        {form.tipe_input !== 'likert' && (
                                            <div>
                                                <InputLabel value="Rentang Nilai Maksimal"
                                                            className="text-emerald-900"/>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <TextInput
                                                        type="number"
                                                        value={form.skala_maks}
                                                        onChange={e => setForm({
                                                            ...form,
                                                            skala_maks: parseFloat(e.target.value)
                                                        })}
                                                        className="w-24 text-center font-bold bg-white"
                                                    />
                                                    <div className="text-xs text-gray-500 leading-tight">
                                                        <p>Isi <b>100</b> jika inputnya berupa Nilai Rapor/Angka.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {form.tipe_input === 'likert' && (
                                            <div
                                                className="bg-emerald-100 text-emerald-800 text-xs p-3 rounded border border-emerald-300">
                                                <strong>Mode Likert Aktif:</strong> Skala nilai otomatis <b>1 s/d 5</b>.
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-emerald-200">
                                            <InputLabel value="Kasus Khusus: Apakah Nilai KECIL justru BAGUS?"
                                                        className="text-emerald-900"/>
                                            <select
                                                className="w-full mt-2 border-emerald-300 rounded-lg shadow-sm text-sm bg-white focus:ring-emerald-500"
                                                value={form.jalur_reverse}
                                                onChange={e => setForm({...form, jalur_reverse: e.target.value})}
                                            >
                                                <option value="">Tidak (Normal: Nilai Besar = Bagus)</option>
                                                <option value="kerja">Ya, Khusus untuk Jalur KERJA</option>
                                                <option value="studi">Ya, Khusus untuk Jalur KULIAH</option>
                                                <option value="wirausaha">Ya, Khusus untuk Jalur WIRAUSAHA</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex-none flex justify-end gap-4 px-8 py-4 border-t bg-gray-50 rounded-b-lg">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2">
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}
                                       className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md font-bold transition-all">
                            {processing ? 'Menyimpan...' : 'Simpan Kriteria'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}