import {useEffect, useState} from 'react';
import  type {FormEvent} from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';
import Header from "../../../components/Header.tsx";

// Tipe Data
interface MonitoringItem {
    id: number;
    user_id?: number;
    name?: string;
    nisn?: string;
    // Struktur nested
    user?: {
        name: string;
        nisn: string;
        jurusan?: { nama_jurusan: string };
    };
    jurusan?: { nama_jurusan: string };
    kelas?: string; // Dari Backend "Belum Mengisi"
    tingkat_kelas?: string; // Dari Backend "Sudah Mengisi" (Snapshot)
    // Data Hasil
    keputusan_terbaik?: string;
    skor_studi?: number;
    skor_kerja?: number;
    skor_wirausaha?: number;
    catatan_guru_bk?: string;
}

interface Periode {
    id: number;
    nama_periode: string;
    is_active: boolean;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    data: MonitoringItem[];
    links?: { url: string | null; label: string; active: boolean }[];
}

export default function MonitoringIndex() {
    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<PaginationData | null>(null);
    const [periodes, setPeriodes] = useState<Periode[]>([]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriode, setSelectedPeriode] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('sudah');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MonitoringItem | null>(null);
    const [catatanInput, setCatatanInput] = useState('');
    const [processing, setProcessing] = useState(false);

    // --- FETCH DATA ---
    const fetchData = async (url: string | null = '/monitoring') => {
        setLoading(true);
        try {
            const response = await apiClient.get(url || '/monitoring', {
                params: {
                    search: searchTerm,
                    periode_id: selectedPeriode,
                    status: selectedStatus,
                    page: 1
                }
            });

            setResults(response.data.results);
            setPeriodes(response.data.periodes || []);
        } catch (error) {
            console.error("Error fetching monitoring data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedPeriode, selectedStatus]);

    // --- HANDLERS ---
    const handlePageChange = (url: string | null) => {
        if (!url) return;
        // Ambil path relatif + query string
        const targetUrl = url.replace(apiClient.defaults.baseURL || '', '');
        fetchData(targetUrl);
    };

    const openModal = (item: MonitoringItem) => {
        setSelectedItem(item);
        setCatatanInput(item.catatan_guru_bk || '');
        setIsModalOpen(true);
    };

    const submitCatatan = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        setProcessing(true);
        try {
            await apiClient.post(`/monitoring/${selectedItem.id}/catatan`, {
                catatan_guru_bk: catatanInput
            });

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Gagal menyimpan catatan", error);
            alert("Terjadi kesalahan saat menyimpan catatan.");
        } finally {
            setProcessing(false);
        }
    };

    // Helper untuk Nilai Tertinggi
    const getNilaiOptima = (item: MonitoringItem) => {
        return Math.max(item.skor_studi || 0, item.skor_kerja || 0, item.skor_wirausaha || 0).toFixed(4);
    };

    return (
        <div>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Monitoring Siswa</h2>
            </Header>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">

                        {/* --- FILTER SECTION --- */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                            {/* Search */}
                            <div className="flex gap-2 w-full md:w-1/3">
                                <input
                                    type="text"
                                    placeholder="Cari Nama / NISN..."
                                    className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Dropdowns */}
                            <div className="flex gap-2 w-full md:w-2/3 justify-end">
                                <select
                                    className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option value="sudah">Sudah Mengisi</option>
                                    <option value="belum">Belum Mengisi</option>
                                </select>

                                <select
                                    className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                    value={selectedPeriode}
                                    onChange={(e) => setSelectedPeriode(e.target.value)}
                                >
                                    <option value="">Semua Periode</option>
                                    {periodes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nama_periode} {p.is_active ? '(Aktif)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* --- TABLE SECTION --- */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas / Jurusan</th>

                                    {selectedStatus === 'sudah' ? (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keputusan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai Optima</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan BK</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                        </>
                                    ) : (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    )}
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                                    </tr>
                                ) : !results?.data || results.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={selectedStatus === 'sudah' ? 7 : 4}
                                            className="px-6 py-8 text-center text-gray-500 italic">
                                            Tidak ada data siswa ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    results.data.map((item, index) => {
                                        // Normalisasi Data (Safe Access)
                                        const siswaName = item.user?.name || item.name || '-';
                                        const siswaNisn = item.user?.nisn || item.nisn || '-';
                                        const jurusanName = item.user?.jurusan?.nama_jurusan || item.jurusan?.nama_jurusan || '-';

                                        // LOGIKA TAMPILAN KELAS:
                                        // Jika "Sudah Mengisi" -> ambil dari 'tingkat_kelas' (snapshot)
                                        // Jika "Belum Mengisi" -> ambil dari 'kelas' (riwayat aktif)
                                        const kelas = item.tingkat_kelas || item.kelas || '-';

                                        const rowNumber = results.current_page ? (results.current_page - 1) * results.per_page + index + 1 : index + 1;

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {rowNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{siswaName}</div>
                                                    <div className="text-sm text-gray-500">{siswaNisn}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className="font-bold">Kelas {kelas}</span> - {jurusanName}
                                                </td>

                                                {selectedStatus === 'sudah' ? (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <BadgeKeputusan label={item.keputusan_terbaik || '-'}/>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                                                            {getNilaiOptima(item)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                            {item.catatan_guru_bk ? (
                                                                <span title={item.catatan_guru_bk}>{item.catatan_guru_bk}</span>
                                                            ) : (
                                                                <span className="italic text-gray-300">Belum ada catatan</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => openModal(item)}
                                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                                                            >
                                                                {item.catatan_guru_bk ? 'Edit Catatan' : '+ Catatan'}
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                                                                Belum Mengisi
                                                            </span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- PAGINATION --- */}
                        <div className="mt-4 flex justify-between items-center">
                            {results && (
                                <div className="text-sm text-gray-500">
                                    Total: {results.total} Data
                                </div>
                            )}

                            {results?.links && results.links.length > 3 && (
                                <div className="flex gap-1">
                                    {results.links.map((link, k) => {
                                        if (!link.url && !link.label) return null;

                                        return (
                                            <button
                                                key={k}
                                                onClick={() => handlePageChange(link.url)}
                                                disabled={!link.url}
                                                className={`px-3 py-1 text-sm rounded border ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                                dangerouslySetInnerHTML={{__html: link.label}}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* --- MODAL CATATAN --- */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Catatan untuk {selectedItem?.user?.name || selectedItem?.name}
                    </h3>
                    <form onSubmit={submitCatatan}>
                        <textarea
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            rows={5}
                            placeholder="Tuliskan catatan konseling, validasi hasil, atau saran tambahan..."
                            value={catatanInput}
                            onChange={(e) => setCatatanInput(e.target.value)}
                            required
                        ></textarea>

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setIsModalOpen(false)}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Catatan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}

// --- SUB COMPONENT ---
function BadgeKeputusan({label}: { label: string }) {
    let classes = "bg-gray-100 text-gray-800";

    if (label === 'Melanjutkan Studi' || label.includes('Studi')) {
        classes = "bg-indigo-100 text-indigo-800 border border-indigo-200";
    } else if (label === 'Bekerja' || label.includes('Kerja')) {
        classes = "bg-green-100 text-green-800 border border-green-200";
    } else if (label === 'Wirausaha') {
        classes = "bg-orange-100 text-orange-800 border border-orange-200";
    }

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}`}>
            {label}
        </span>
    );
}