import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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


    const handlePrintUAT = async (target: 'admin' | 'pakar') => {
        try {
            const response = await apiClient.get('/monitoring/export-uat', {
                params: { periode_id: selectedPeriode }
            });
            const data = response.data.data;

            if (data.length === 0) {
                alert("Tidak ada data siswa untuk periode ini.");
                return;
            }

            const isPakar = target === 'pakar';
            const title = isPakar ? 'LEMBAR VALIDASI PAKAR (BLIND TEST)' : 'LEMBAR REKAPITULASI UAT (SISTEM VS PAKAR)';
            const desc = isPakar
                ? 'Mohon berikan rekomendasi karir (Melanjutkan Studi / Bekerja / Berwirausaha) berdasarkan profil indikator masing-masing siswa.'
                : 'Digunakan untuk rekapitulasi perhitungan Confusion Matrix pengujian fungsionalitas sistem.';

            // Generate HTML dengan UI/UX Cetak yang lebih baik
            const printContents = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        /* Konfigurasi Dasar & Print */
                        body { font-family: 'Inter', sans-serif; padding: 20px; color: #1f2937; line-height: 1.5; background: #fff; }
                        @media print {
                            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            tfoot { display: table-footer-group; }
                        }

                        /* Header Kop */
                        .kop-header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
                        .kop-header h2 { margin: 0 0 5px 0; font-size: 18px; color: #111827; letter-spacing: 0.5px; }
                        .kop-header p { margin: 0; color: #6b7280; font-size: 12px; }

                        /* Styling Tabel */
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 10px; vertical-align: top; }
                        th { background-color: #f3f4f6; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 11px; text-align: left; }
                        
                        /* Zebra Striping */
                        tbody tr:nth-child(even) { background-color: #f9fafb; }
                        
                        /* Kolom Siswa */
                        .siswa-name { font-size: 13px; font-weight: 700; color: #111827; }
                        .siswa-nisn { font-size: 11px; color: #6b7280; margin-top: 4px; }

                        /* List Kriteria Jawaban */
                        .jawaban-list { list-style: none; margin: 0; padding: 0; }
                        .jawaban-list li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; }
                        .jawaban-list li:last-child { border-bottom: none; padding-bottom: 0; }
                        .k-label { color: #4b5563; max-width: 60%; }
                        .k-val { font-weight: 600; color: #111827; text-align: right; max-width: 40%; }

                        /* Checkbox Kustom & Layout Kolom T/F */
                        .tf-container { display: flex; flex-direction: column; gap: 10px; margin-top: 5px; }
                        .tf-item { display: flex; align-items: center; font-size: 12px; font-weight: 600; color: #4b5563; }
                        .box { width: 14px; height: 14px; border: 1.5px solid #9ca3af; border-radius: 3px; margin-right: 8px; background: #fff; }

                        /* Utility */
                        .sys-rec { font-weight: 700; color: #0369a1; background: #f0f9ff; padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid #bae6fd; }
                    </style>
                </head>
                <body>
                    <div class="kop-header">
                        <h2>${title}</h2>
                        <p>${desc}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 3%; text-align: center;">No</th>
                                <th style="width: 17%;">Identitas Siswa</th>
                                <th style="width: ${isPakar ? '50%' : '40%'};">Profil Jawaban / Kriteria Analisis</th>
                                ${!isPakar ? `<th style="width: 15%;">Rekomendasi Sistem</th>` : ''}
                                <th style="width: ${isPakar ? '20%' : '15%'};">Rekomendasi Pakar</th>
                                <th style="width: 10%; text-align: center;">Sesuai?</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any, i: number) => {
                                // Memformat list jawaban menjadi layout flexbox (kiri-kanan)
                                const listJawaban = item.detail_jawaban
                                    .map((dj: any) => `
                                        <li>
                                            <span class="k-label">${dj.kriteria}</span>
                                            <span class="k-val">${dj.nilai}</span>
                                        </li>
                                    `).join('');

                                return `
                                <tr>
                                    <td style="text-align: center; color: #6b7280;">${i + 1}</td>
                                    <td>
                                        <div class="siswa-name">${item.name}</div>
                                        <div class="siswa-nisn">NISN: ${item.nisn || '-'}</div>
                                    </td>
                                    <td>
                                        <ul class="jawaban-list">
                                            ${listJawaban}
                                        </ul>
                                    </td>
                                    ${!isPakar ? `<td><span class="sys-rec">${item.keputusan_terbaik}</span></td>` : ''}
                                    <td>
                                        </td>
                                    <td>
                                        <div class="tf-container">
                                            <div class="tf-item"><div class="box"></div> True</div>
                                            <div class="tf-item"><div class="box"></div> False</div>
                                        </div>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(printContents);
                printWindow.document.close();
                printWindow.focus();

                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 700); // Sedikit ditambah waktunya agar font Google terload dengan baik sebelum dialog print muncul
            }
        } catch (error) {
            console.error("Gagal export UAT", error);
            alert("Terjadi kesalahan saat mengambil data untuk dicetak.");
        }
    };

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
                                {selectedStatus === 'sudah' && (
                                    <div className="flex gap-2 mr-2">
                                        <button
                                            onClick={() => handlePrintUAT('pakar')}
                                            className="inline-flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-indigo-100 transition ease-in-out duration-150"
                                        >
                                            📄 PDF Pakar
                                        </button>
                                        <button
                                            onClick={() => handlePrintUAT('admin')}
                                            className="inline-flex items-center px-3 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-gray-100 transition ease-in-out duration-150"
                                        >
                                            📊 PDF Admin
                                        </button>
                                    </div>
                                )}

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
                                                                <BadgeKeputusan label={item.keputusan_terbaik || '-'} />
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
                                                className={`px-3 py-1 text-sm rounded border ${link.active
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                    } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
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
function BadgeKeputusan({ label }: { label: string }) {
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