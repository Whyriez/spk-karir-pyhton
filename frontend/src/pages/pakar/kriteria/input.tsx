import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import apiClient from '@/lib/axios';
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

interface PertanyaanItem {
    id: number;
    teks: string;
}

interface SelectOption {
    val: number | string;
    label: string;
    desc?: string;
}

interface Kriteria {
    id: number;
    kode: string;
    nama: string;
    list_pertanyaan: PertanyaanItem[];
    tipe_input: string;
    opsi_pilihan?: SelectOption[] | string;
    skala_maks: number;
    sumber_nilai?: string;
}

export default function ManajemenPertanyaanPakar() {
    const [data, setData] = useState<Kriteria[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKriteria, setEditingKriteria] = useState<Kriteria | null>(null);

    const [formQuestions, setFormQuestions] = useState<string[]>([]);
    const [formOptions, setFormOptions] = useState<SelectOption[]>([]);
    const [processing, setProcessing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/kriteria');
            setData(response.data.data);
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Gagal memuat data kriteria' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditModal = (item: Kriteria) => {
        setEditingKriteria(item);

        // 1. Set Pertanyaan
        if (item.list_pertanyaan && item.list_pertanyaan.length > 0) {
            setFormQuestions(item.list_pertanyaan.map(p => p.teks));
        } else {
            setFormQuestions(['']);
        }

        // 2. Set Opsi Pilihan
        let loadedOpts: SelectOption[] = [];
        if (item.opsi_pilihan) {
            if (Array.isArray(item.opsi_pilihan)) {
                loadedOpts = item.opsi_pilihan;
            } else if (typeof item.opsi_pilihan === 'string') {
                try { loadedOpts = JSON.parse(item.opsi_pilihan); } catch (e) { }
            }
        }

        // Jika Likert tapi opsi masih kosong (bawaan baru bikin), kasih default + desc
        if (loadedOpts.length === 0 && item.tipe_input === 'likert') {
            loadedOpts = [
                { val: 1, label: 'STS', desc: 'Sangat Tidak Setuju' },
                { val: 2, label: 'TS', desc: 'Tidak Setuju' },
                { val: 3, label: 'N', desc: 'Netral / Ragu-ragu' },
                { val: 4, label: 'S', desc: 'Setuju' },
                { val: 5, label: 'SS', desc: 'Sangat Setuju' }
            ];
        }

        setFormOptions(loadedOpts);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingKriteria(null);
        setFormQuestions([]);
        setFormOptions([]);
    };

    // --- HANDLER PERTANYAAN ---
    const handleQuestionChange = (index: number, value: string) => {
        const newQuestions = [...formQuestions];
        newQuestions[index] = value;
        setFormQuestions(newQuestions);
    };

    const addQuestionField = () => setFormQuestions([...formQuestions, '']);
    const removeQuestionField = (index: number) => setFormQuestions(formQuestions.filter((_, i) => i !== index));

    const updateOption = (index: number, field: 'val' | 'label' | 'desc', value: string) => {
        const newOpts = [...formOptions];
        newOpts[index] = { ...newOpts[index], [field]: value };
        setFormOptions(newOpts);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingKriteria) return;

        setProcessing(true);
        try {
            const cleanQuestions = formQuestions.filter(q => q.trim() !== "");
            const payload: any = { list_pertanyaan: cleanQuestions };

            // Kirim Opsi Pilihan juga jika tipenya likert atau select
            if (['likert', 'select'].includes(editingKriteria.tipe_input)) {
                payload.opsi_pilihan = formOptions;
            }

            await apiClient.put(`/kriteria/${editingKriteria.id}`, payload);

            await fetchData();
            closeModal();
            Toast.fire({ icon: 'success', title: 'Data berhasil diperbarui!' });
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menyimpan.';
            MySwal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Manajemen Pertanyaan & Opsi Kriteria
                </h2>
            </Header>

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border border-gray-200">
                        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
                            <p className="text-sm text-blue-700">
                                <strong>Panduan Pakar:</strong> Susun daftar pertanyaan dan atur label opsi pilihan (Misal: 1=Sangat Kurang, 5=Sangat Baik) agar sesuai dengan instrumen pengukuran Anda.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kode</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kriteria</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipe Input</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pertanyaan</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Sedang memuat data...</td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 align-top">{item.kode}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-700 align-top">{item.nama}</td>
                                                <td className="px-6 py-4 text-sm align-top">
                                                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                                                        {item.tipe_input}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 align-top">
                                                    {item.list_pertanyaan?.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {item.list_pertanyaan.map((p) => (
                                                                <li key={p.id}>{p.teks}</li>
                                                            ))}
                                                        </ul>
                                                    ) : <span className="text-red-400 italic text-xs">Belum ada pertanyaan</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm align-top">
                                                    <button onClick={() => openEditModal(item)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md font-bold">
                                                        Kelola
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

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="3xl">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="flex-none px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">
                            Kelola Instrumen: <span className="text-indigo-600">{editingKriteria?.nama}</span>
                        </h2>
                        <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {editingKriteria?.kode}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* BAGIAN 1: PERTANYAAN */}
                        <div>
                            <InputLabel value="1. Daftar Pertanyaan (Siswa/Kaprodi akan menjawab butir ini)" className="mb-2 text-indigo-800 font-bold" />
                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                {formQuestions.map((q, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="mt-2 text-xs text-gray-400 font-mono w-6 text-right select-none">#{index + 1}</div>
                                        <textarea
                                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                            rows={2} value={q}
                                            onChange={(e) => handleQuestionChange(index, e.target.value)}
                                            placeholder={`Tulis pertanyaan ke-${index + 1}...`} required
                                        />

                                        {/* Kunci Tombol Hapus (X) jika ini pertanyaan pertama dari kriteria Static Jurusan */}
                                        {!(editingKriteria?.sumber_nilai === 'static_jurusan' && index === 0) && (
                                            <button type="button" onClick={() => removeQuestionField(index)} className="mt-1 text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50">
                                                x
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Sembunyikan Tombol "Tambah Baris" jika ini Kriteria Static Jurusan */}
                                {editingKriteria?.sumber_nilai !== 'static_jurusan' ? (
                                    <button type="button" onClick={addQuestionField} className="text-sm text-indigo-600 font-bold hover:underline mt-2 inline-block">
                                        + Tambah Baris Pertanyaan
                                    </button>
                                ) : (
                                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Kriteria "Static Jurusan" hanya diizinkan memiliki 1 butir pertanyaan/pernyataan.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BAGIAN 2: OPSI PILIHAN (Hanya muncul jika tipe select/likert) */}
                        {['likert', 'select'].includes(editingKriteria?.tipe_input || '') && (
                            <div>
                                <InputLabel value="2. Label Opsi / Pilihan Jawaban" className="mb-2 text-indigo-800 font-bold" />
                                <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">

                                    {/* HEADER TABEL DINAMIS */}
                                    <div className="flex items-center text-xs font-bold text-gray-500 mb-2 border-b pb-2">
                                        <div className="w-16 text-center">Nilai</div>
                                        {editingKriteria?.tipe_input === 'likert' ? (
                                            <>
                                                <div className="w-24 text-center">Singkatan</div>
                                                <div className="flex-1 px-2">Kepanjangan Label</div>
                                            </>
                                        ) : (
                                            <div className="flex-1 px-2">Keterangan Opsi / Jawaban</div>
                                        )}
                                    </div>

                                    {/* LOOPING OPSI */}
                                    {formOptions.map((opt, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            {/* NILAI (VAL) DIKUNCI */}
                                            <div className="w-16 text-center text-sm font-bold font-mono bg-gray-100 py-2 rounded-md border border-gray-200 text-gray-600 select-none cursor-not-allowed shadow-inner">
                                                {opt.val}
                                            </div>

                                            {/* RENDER INPUT DINAMIS BERDASARKAN TIPE */}
                                            {editingKriteria?.tipe_input === 'likert' ? (
                                                <>
                                                    {/* LABEL SINGKATAN (Khusus Likert) */}
                                                    <TextInput
                                                        type="text"
                                                        className="w-24 text-sm text-center font-bold uppercase bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="Cth: STS"
                                                        value={opt.label}
                                                        onChange={(e) => updateOption(idx, 'label', e.target.value.toUpperCase())}
                                                        maxLength={5}
                                                        required
                                                    />
                                                    {/* LABEL KEPANJANGAN (Khusus Likert) */}
                                                    <TextInput
                                                        type="text"
                                                        className="flex-1 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="Cth: Sangat Tidak Setuju"
                                                        value={opt.desc || ''}
                                                        onChange={(e) => updateOption(idx, 'desc', e.target.value)}
                                                        required
                                                    />
                                                </>
                                            ) : (
                                                /* LABEL TUNGGAL (Khusus Select) */
                                                <TextInput
                                                    type="text"
                                                    className="flex-1 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                                    placeholder="Cth: < 1 Juta Rupiah"
                                                    value={opt.label}
                                                    onChange={(e) => updateOption(idx, 'label', e.target.value)}
                                                    required
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Info Peringatan untuk Pakar (Dinamis Teksnya) */}
                                    <div className="mt-4 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 font-medium leading-relaxed">
                                        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p>
                                            <strong>Akses Dibatasi:</strong> Jumlah opsi dan besaran angka (bobot) telah dikunci oleh Admin untuk menjaga validitas perhitungan algoritma MOORA. Anda hanya diizinkan untuk menyesuaikan {editingKriteria?.tipe_input === 'likert' ? 'Singkatan dan Kepanjangan label.' : 'teks opsi jawaban.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-none px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeModal}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {processing ? 'Menyimpan...' : 'Simpan Instrumen'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}