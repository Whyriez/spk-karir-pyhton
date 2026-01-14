import  { useEffect, useState } from 'react';
import  type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/axios';
import Header from "../../components/Header.tsx";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// --- KONFIGURASI SWEETALERT ---
const MySwal = withReactContent(Swal);

// Konfigurasi Toast (Notifikasi kecil di pojok kanan atas)
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

// --- TIPE DATA ---
interface PertanyaanItem {
    id: number;
    teks: string;
}

interface KriteriaItem {
    id: number;
    kode: string;
    nama: string;
    list_pertanyaan: PertanyaanItem[];
    tipe_input: 'number' | 'select' | 'likert';
    kategori: string;
    opsi_pilihan?: { val: string | number; label: string }[];
    value?: string | number;
    skala_maks: number;
}

export default function InputDataSiswa() {
    const [kriterias, setKriterias] = useState<KriteriaItem[]>([]);
    const [values, setValues] = useState<Record<string, string | number>>({});
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isEligible, setIsEligible] = useState(true);
    const [ineligibleMsg, setIneligibleMsg] = useState('');

    const navigate = useNavigate();

    // 1. FETCH DATA
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.get('/siswa/form');

                // Cek flag dari backend
                if (response.data.is_eligible === false) {
                    setIsEligible(false);
                    setIneligibleMsg(response.data.message);
                    setLoading(false);
                    return; // Stop
                }

                setKriterias(response.data.data);
            } catch (error) {
                console.error("Gagal memuat form:", error);
                Toast.fire({
                    icon: 'error',
                    title: 'Gagal memuat form',
                    text: 'Periksa koneksi internet Anda.'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // JIKA TIDAK ELIGIBLE (SUDAH ISI / AKUN DIKUNCI)
    if (!isEligible) {
        return (
            <>
                <Header><h2 className="font-semibold text-xl text-gray-800">Input Data Siswa</h2></Header>
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 shadow-sm rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-lg font-medium text-yellow-800">Akses Dibatasi</h3>
                                    <p className="mt-2 text-sm text-yellow-700">
                                        {ineligibleMsg}
                                    </p>
                                    <div className="mt-4">
                                        <button onClick={() => navigate('/siswa/result')} className="text-sm font-bold text-yellow-800 underline hover:text-yellow-900">
                                            Lihat Riwayat Hasil &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 2. FILTER KATEGORI
    const listAkademik = kriterias.filter(k => k.kategori === 'akademik');
    const listKuesioner = kriterias.filter(k => k.kategori === 'kuesioner');

    // 3. HANDLERS
    const handleChange = (pertanyaanId: number, value: string | number, maxVal?: number) => {
        // VALIDASI NUMBER
        if (typeof maxVal === 'number') {
            const numVal = parseFloat(String(value));

            // Jika kosong, biarkan kosong (untuk bisa hapus)
            if (value === '') {
                setValues(prev => ({...prev, [pertanyaanId]: ''}));
                return;
            }

            // Jika melebihi batas, tolak input & kasih warning Toast
            if (!isNaN(numVal) && numVal > maxVal) {
                Toast.fire({
                    icon: 'warning',
                    title: 'Melebihi Batas',
                    text: `Nilai maksimal untuk isian ini adalah ${maxVal}`
                });
                return;
            }

            // Jika negatif, tolak
            if (!isNaN(numVal) && numVal < 0) return;
        }

        setValues(prev => ({...prev, [pertanyaanId]: value}));
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();

        // Konfirmasi sebelum submit (Opsional, agar user yakin)
        const result = await MySwal.fire({
            title: 'Simpan Data?',
            text: "Pastikan semua data sudah terisi dengan benar.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5', // Indigo-600
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        setProcessing(true);

        try {
            await apiClient.post('/siswa/save', {values});

            await MySwal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data siswa berhasil disimpan.',
                timer: 2000,
                showConfirmButton: false
            });

            navigate('/siswa/result');

        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';

            MySwal.fire({
                icon: 'error',
                title: 'Gagal',
                text: errMsg
            });
        } finally {
            setProcessing(false);
        }
    };

    // 4. RENDER INPUT FIELD
    const renderInputField = (k: KriteriaItem, p: PertanyaanItem) => {
        const inputKey = p.id;
        const val = values[inputKey] !== undefined ? values[inputKey] : '';

        // A. Tipe NUMBER
        if (k.tipe_input === 'number') {
            return (
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        step="0.01"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm"
                        placeholder={`0 - ${k.skala_maks}`}
                        value={val}
                        onChange={(e) => handleChange(inputKey, e.target.value, k.skala_maks)}
                        min={0}
                        max={k.skala_maks}
                        required
                    />
                    <span className="text-xs text-gray-500 font-mono whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                        Max: {k.skala_maks}
                    </span>
                </div>
            );
        }

        // B. Tipe SELECT
        if (k.tipe_input === 'select') {
            let options = k.opsi_pilihan || [];
            if (typeof options === 'string') {
                try {
                    options = JSON.parse(options);
                } catch (e) {
                    options = [];
                }
            }

            return (
                <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm"
                    value={val}
                    onChange={(e) => handleChange(inputKey, e.target.value)}
                    required
                >
                    <option value="">-- Pilih Opsi --</option>
                    {Array.isArray(options) && options.map((opt: any, idx: number) => (
                        <option key={idx} value={opt.val}>{opt.label}</option>
                    ))}
                </select>
            );
        }

        // C. Tipe LIKERT
        if (k.tipe_input === 'likert') {
            const likertOptions = [
                {val: 1, label: 'STS'}, {val: 2, label: 'TS'},
                {val: 3, label: 'N'}, {val: 4, label: 'S'}, {val: 5, label: 'SS'}
            ];
            const currentValue = Number(val);

            return (
                <div className="grid grid-cols-5 gap-2 mt-2 md:w-3/4">
                    {likertOptions.map(opt => (
                        <label key={opt.val} className={`
                            cursor-pointer border rounded-md p-2 text-center transition-all flex flex-col items-center justify-center
                            ${currentValue === opt.val
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 shadow-lg transform scale-105'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name={`p_${inputKey}`}
                                value={opt.val}
                                checked={currentValue === opt.val}
                                onChange={(e) => handleChange(inputKey, e.target.value)}
                                className="sr-only"
                                required
                            />
                            <div className="font-bold text-lg">{opt.val}</div>
                            <div className="text-[10px] uppercase font-semibold">{opt.label}</div>
                        </label>
                    ))}
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-10 text-center text-gray-500 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                        Memuat formulir...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800">Input Data Siswa</h2>
            </Header>
            <div className="py-12">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="space-y-8">

                        {/* BAGIAN 1: Data Akademik & Ekonomi */}
                        {listAkademik.length > 0 && (
                            <div className="bg-white p-6 shadow-sm rounded-lg border-l-4 border-blue-500">
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* KOLOM KIRI: INPUT FORM */}
                                    <div className="flex-1 space-y-6">
                                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b border-gray-100 pb-2">
                                            1. Data Akademik & Ekonomi
                                        </h3>
                                        <div className="space-y-4">
                                            {listAkademik.map(k => (
                                                <div key={k.id} className="border-b border-gray-50 pb-4 last:border-0">
                                                    {/* Header Kriteria */}
                                                    <div className="font-semibold text-gray-800 mb-2">{k.kode} - {k.nama}</div>

                                                    {/* Loop Pertanyaan Akademik */}
                                                    {k.list_pertanyaan && k.list_pertanyaan.length > 0 ? (
                                                        k.list_pertanyaan.map((p, index) => (
                                                            <div key={p.id} className="mb-3">
                                                                <label className="block text-sm text-gray-600 mb-1">
                                                                    <span className="font-medium mr-1">{index + 1}.</span> {p.teks}
                                                                </label>
                                                                {renderInputField(k, p)}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-red-500 text-xs italic bg-red-50 p-2 rounded">
                                                            Error: Belum ada pertanyaan diset untuk kriteria ini.
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* KOLOM KANAN: PENJELASAN (LEGEND) */}
                                    <div className="md:w-1/3">
                                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 sticky top-4">
                                            <h4 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                Panduan Pengisian
                                            </h4>

                                            <div className="text-xs text-blue-800 mb-4">
                                                <p className="mb-2 font-semibold">Keterangan Skala Penilaian:</p>
                                                <ul className="space-y-2 pl-1">
                                                    <li className="flex items-center gap-2">
                                                        <span className="bg-white border border-blue-200 px-2 py-1 rounded font-bold w-10 text-center text-blue-600">STS</span>
                                                        <span>Sangat Tidak Setuju (1)</span>
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="bg-white border border-blue-200 px-2 py-1 rounded font-bold w-10 text-center text-blue-600">TS</span>
                                                        <span>Tidak Setuju (2)</span>
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="bg-white border border-blue-200 px-2 py-1 rounded font-bold w-10 text-center text-blue-600">N</span>
                                                        <span>Netral / Ragu-ragu (3)</span>
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="bg-white border border-blue-200 px-2 py-1 rounded font-bold w-10 text-center text-blue-600">S</span>
                                                        <span>Setuju (4)</span>
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="bg-white border border-blue-200 px-2 py-1 rounded font-bold w-10 text-center text-blue-600">SS</span>
                                                        <span>Sangat Setuju (5)</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="text-[10px] text-blue-600 border-t border-blue-200 pt-2 italic">
                                                *Gunakan panduan ini untuk mengisi bagian Kuesioner Minat di bawah.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BAGIAN 2: Kuesioner Minat */}
                        {listKuesioner.length > 0 && (
                            <div className="bg-white p-6 shadow-sm rounded-lg border-l-4 border-green-500">
                                <h3 className="text-lg font-bold mb-4 text-gray-800 border-b border-gray-100 pb-2">
                                    2. Kuesioner Minat
                                </h3>
                                <div className="space-y-8">
                                    {listKuesioner.map(k => (
                                        <div key={k.id} className="border-b border-gray-100 pb-6 last:border-0">
                                            <div className="font-bold text-lg text-gray-900 mb-2">
                                                {k.kode} - {k.nama}
                                            </div>

                                            <div className="pl-4 space-y-6">
                                                {k.list_pertanyaan && k.list_pertanyaan.length > 0 ? (
                                                    k.list_pertanyaan.map((p, index) => (
                                                        <div key={p.id}>
                                                            <p className="text-sm text-gray-700 mb-2">
                                                                <span className="font-bold mr-1">{index + 1}.</span> {p.teks}
                                                            </p>
                                                            {renderInputField(k, p)}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 italic text-sm">Tidak ada pertanyaan.</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 pb-10">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center px-8 py-3 bg-indigo-600 border border-transparent rounded-lg font-semibold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition ease-in-out duration-150"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </>
                                ) : 'Simpan Data'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
}