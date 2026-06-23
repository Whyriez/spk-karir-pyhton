import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';
import Header from "@/components/Header";

// Tipe Data
interface MonitoringItem {
    id: number;
    siswa_id?: number;
    user_id?: number;
    name?: string;
    nisn?: string;
    user?: {
        name: string;
        nisn: string;
        jurusan?: { nama_jurusan: string };
    };
    jurusan?: { nama_jurusan: string };
    kelas?: string;
    tingkat_kelas?: string;
    keputusan_terbaik?: string;
    skor_studi?: number;
    skor_kerja?: number;
    skor_wirausaha?: number;
    catatan_guru_bk?: string;
    riwayat_rekomendasi?: { kelas: string; keputusan: string; periode: string }[];
}

interface Periode {
    id: number;
    nama_periode: string;
    is_active: boolean;
}

interface Jurusan {
    id: number;
    nama: string;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    data: MonitoringItem[];
    links?: { url: string | null; label: string; active: boolean }[];
}

export default function MonitoringPakar() {
    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<PaginationData | null>(null);
    const [periodes, setPeriodes] = useState<Periode[]>([]);
    const [jurusans, setJurusans] = useState<Jurusan[]>([]);

    // Cek Role Pakar
    const [isKaprodi, setIsKaprodi] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriode, setSelectedPeriode] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('sudah');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [selectedJurusan, setSelectedJurusan] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MonitoringItem | null>(null);
    const [catatanInput, setCatatanInput] = useState('');
    const [processing, setProcessing] = useState(false);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [selectedRiwayatIdx, setSelectedRiwayatIdx] = useState(0);

    // Initial Mount: Cek User Role & Fetch Jurusan
    useEffect(() => {
        // Cek apakah user adalah kaprodi
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userObj = JSON.parse(userStr);
            if (userObj.role === 'pakar' && userObj.jenis_pakar === 'kaprodi') {
                setIsKaprodi(true);
            }
        }

        apiClient.get('/jurusan').then(res => {
            if (res.data && res.data.data) {
                setJurusans(res.data.data);
            }
        }).catch(err => console.error(err));
    }, []);

    const openDetailModal = async (item: MonitoringItem) => {
        setIsDetailModalOpen(true);
        setLoadingDetail(true);
        setDetailData(null);
        setSelectedRiwayatIdx(0);
        try {
            const targetId = item.siswa_id || item.user_id || item.id;
            const res = await apiClient.get(`/monitoring/${targetId}/detail`);
            setDetailData(res.data);
        } catch (error) {
            console.error("Gagal mengambil detail siswa", error);
            alert("Terjadi kesalahan saat mengambil detail.");
        } finally {
            setLoadingDetail(false);
        }
    };

    // const handlePrintUAT = async (target: 'admin' | 'pakar') => {
    //     try {
    //         const response = await apiClient.get('/monitoring/export-uat', {
    //             params: {
    //                 periode_id: selectedPeriode,
    //                 kelas: selectedKelas,
    //                 // Jika Kaprodi, kirim kosong saja, karena backend sudah otomatis mengunci berdasarkan user login
    //                 jurusan_id: isKaprodi ? '' : selectedJurusan
    //             }
    //         });
    //         const data = response.data.data;

    //         if (data.length === 0) {
    //             alert("Tidak ada data siswa untuk kriteria filter ini.");
    //             return;
    //         }

    //         const isPakar = target === 'pakar';
    //         const title = isPakar ? 'LEMBAR VALIDASI PAKAR (BLIND TEST)' : 'LEMBAR REKAPITULASI UAT (SISTEM VS PAKAR)';
    //         const desc = isPakar
    //             ? 'Mohon berikan rekomendasi karir (Melanjutkan Studi / Bekerja / Berwirausaha) berdasarkan profil indikator masing-masing siswa.'
    //             : 'Digunakan untuk rekapitulasi perhitungan Confusion Matrix pengujian fungsionalitas sistem.';

    //         const printContents = `
    //             <!DOCTYPE html>
    //             <html>
    //             <head>
    //                 <meta charset="UTF-8">
    //                 <title>${title}</title>
    //                 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    //                 <style>
    //                     body { font-family: 'Inter', sans-serif; padding: 20px; color: #1f2937; line-height: 1.5; background: #fff; }
    //                     @media print {
    //                         body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    //                         table { page-break-inside: auto; }
    //                         tr { page-break-inside: avoid; page-break-after: auto; }
    //                         thead { display: table-header-group; }
    //                         tfoot { display: table-footer-group; }
    //                     }
    //                     .kop-header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
    //                     .kop-header h2 { margin: 0 0 5px 0; font-size: 18px; color: #111827; letter-spacing: 0.5px; }
    //                     .kop-header p { margin: 0; color: #6b7280; font-size: 12px; }
    //                     table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    //                     th, td { border: 1px solid #d1d5db; padding: 12px 10px; vertical-align: top; }
    //                     th { background-color: #f3f4f6; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 11px; text-align: left; }
    //                     tbody tr:nth-child(even) { background-color: #f9fafb; }
    //                     .siswa-name { font-size: 13px; font-weight: 700; color: #111827; }
    //                     .siswa-nisn { font-size: 11px; color: #6b7280; margin-top: 4px; }
    //                     .jawaban-list { list-style: none; margin: 0; padding: 0; }
    //                     .jawaban-list li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; }
    //                     .jawaban-list li:last-child { border-bottom: none; padding-bottom: 0; }
    //                     .k-label { color: #4b5563; max-width: 60%; }
    //                     .k-val { font-weight: 600; color: #111827; text-align: right; max-width: 40%; }
    //                     .tf-container { display: flex; flex-direction: column; gap: 10px; margin-top: 5px; }
    //                     .tf-item { display: flex; align-items: center; font-size: 12px; font-weight: 600; color: #4b5563; }
    //                     .box { width: 14px; height: 14px; border: 1.5px solid #9ca3af; border-radius: 3px; margin-right: 8px; background: #fff; }
    //                     .sys-rec { font-weight: 700; color: #0369a1; background: #f0f9ff; padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid #bae6fd; }
    //                 </style>
    //             </head>
    //             <body>
    //                 <div class="kop-header">
    //                     <h2>${title}</h2>
    //                     <p>${desc}</p>
    //                 </div>
    //                 <table>
    //                     <thead>
    //                         <tr>
    //                             <th style="width: 3%; text-align: center;">No</th>
    //                             <th style="width: 17%;">Identitas Siswa</th>
    //                             <th style="width: ${isPakar ? '50%' : '40%'};">Profil Jawaban / Kriteria Analisis</th>
    //                             ${!isPakar ? `<th style="width: 15%;">Rekomendasi Sistem</th>` : ''}
    //                             <th style="width: ${isPakar ? '20%' : '15%'};">Rekomendasi Pakar</th>
    //                             <th style="width: 10%; text-align: center;">Sesuai?</th>
    //                         </tr>
    //                     </thead>
    //                     <tbody>
    //                         ${data.map((item: any, i: number) => {
    //             const listJawaban = item.detail_jawaban
    //                 .map((dj: any) => `
    //                                     <li>
    //                                         <span class="k-label">${dj.kriteria}</span>
    //                                         <span class="k-val">${dj.nilai}</span>
    //                                     </li>
    //                                 `).join('');

    //             return `
    //                             <tr>
    //                                 <td style="text-align: center; color: #6b7280;">${i + 1}</td>
    //                                 <td>
    //                                     <div class="siswa-name">${item.name}</div>
    //                                     <div class="siswa-nisn">NISN: ${item.nisn || '-'}</div>
    //                                 </td>
    //                                 <td>
    //                                     <ul class="jawaban-list">
    //                                         ${listJawaban}
    //                                     </ul>
    //                                 </td>
    //                                 ${!isPakar ? `<td><span class="sys-rec">${item.keputusan_terbaik}</span></td>` : ''}
    //                                 <td>
    //                                     </td>
    //                                 <td>
    //                                     <div class="tf-container">
    //                                         <div class="tf-item"><div class="box"></div> True</div>
    //                                         <div class="tf-item"><div class="box"></div> False</div>
    //                                     </div>
    //                                 </td>
    //                             </tr>
    //                             `;
    //         }).join('')}
    //                     </tbody>
    //                 </table>
    //             </body>
    //             </html>
    //         `;

    //         const printWindow = window.open('', '_blank');
    //         if (printWindow) {
    //             printWindow.document.write(printContents);
    //             printWindow.document.close();
    //             printWindow.focus();

    //             setTimeout(() => {
    //                 printWindow.print();
    //                 printWindow.close();
    //             }, 700);
    //         }
    //     } catch (error) {
    //         console.error("Gagal export UAT", error);
    //         alert("Terjadi kesalahan saat mengambil data untuk dicetak.");
    //     }
    // };

    // --- FETCH DATA ---
    const fetchData = async (url: string | null = '/monitoring') => {
        setLoading(true);
        try {
            const response = await apiClient.get(url || '/monitoring', {
                params: {
                    search: searchTerm,
                    periode_id: selectedPeriode,
                    status: selectedStatus,
                    kelas: selectedKelas,
                    jurusan_id: isKaprodi ? '' : selectedJurusan, // Abaikan jika Kaprodi
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

    // Debounce Search & Fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedPeriode, selectedStatus, selectedKelas, selectedJurusan, isKaprodi]);

    // --- HANDLERS ---
    const handlePageChange = (url: string | null) => {
        if (!url) return;
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

    const getNilaiOptima = (item: MonitoringItem) => {
        return Math.max(item.skor_studi || 0, item.skor_kerja || 0, item.skor_wirausaha || 0).toFixed(4);
    };

    return (
        <div>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Monitoring Siswa</h2>
            </Header>
            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 p-6">

                        {/* --- FILTER SECTION --- */}
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            {/* Grid disesuaikan otomatis: Jika Kaprodi (4 kolom), jika bukan (5 kolom) */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${isKaprodi ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3`}>
                                <div className="lg:col-span-1">
                                    <input
                                        type="text"
                                        placeholder="Cari Nama / NISN..."
                                        className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <select
                                        className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                    >
                                        <option value="sudah">Sudah Mengisi</option>
                                        <option value="belum">Belum Mengisi</option>
                                    </select>
                                </div>
                                <div className="lg:col-span-1">
                                    <select
                                        className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
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
                                <div className="lg:col-span-1">
                                    <select
                                        className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                        value={selectedKelas}
                                        onChange={(e) => setSelectedKelas(e.target.value)}
                                    >
                                        <option value="">Semua Kelas</option>
                                        <option value="10">Kelas 10</option>
                                        <option value="11">Kelas 11</option>
                                        <option value="12">Kelas 12</option>
                                    </select>
                                </div>

                                {/* Dropdown Jurusan di-hide jika yang login adalah Kaprodi */}
                                {!isKaprodi && (
                                    <div className="lg:col-span-1">
                                        <select
                                            className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm truncate"
                                            value={selectedJurusan}
                                            onChange={(e) => setSelectedJurusan(e.target.value)}
                                        >
                                            <option value="">Semua Jurusan</option>
                                            {jurusans.map((j) => (
                                                <option key={j.id} value={j.id}>{j.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Tombol PDF di Baris Bawah */}
                            {/* {selectedStatus === 'sudah' && (
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <button
                                        onClick={() => handlePrintUAT('pakar')}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-indigo-100 transition ease-in-out duration-150"
                                    >
                                        📄 Unduh PDF Validasi Pakar
                                    </button>
                                
                                    <button
                                        onClick={() => handlePrintUAT('admin')}
                                        className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-gray-100 transition ease-in-out duration-150"
                                    >
                                        📊 Unduh PDF Rekapitulasi Admin
                                    </button>
                                </div>
                            )} */}
                        </div>

                        {/* --- TABLE SECTION --- */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Siswa</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas & Jurusan</th>

                                        {selectedStatus === 'sudah' ? (
                                            <>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Keputusan</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Riwayat</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nilai Optima</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Catatan BK</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                            </>
                                        ) : (
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
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
                                                Tidak ada data siswa sesuai kriteria filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        results.data.map((item, index) => {
                                            const siswaName = item.user?.name || item.name || '-';
                                            const siswaNisn = item.user?.nisn || item.nisn || '-';
                                            const jurusanName = item.user?.jurusan?.nama_jurusan || item.jurusan?.nama_jurusan || '-';
                                            const kelas = item.tingkat_kelas || item.kelas || '-';
                                            const rowNumber = results.current_page ? (results.current_page - 1) * results.per_page + index + 1 : index + 1;

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                        {rowNumber}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-gray-900">{siswaName}</div>
                                                        <div className="text-sm text-gray-500">{siswaNisn}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mr-2">Kelas {kelas}</span>
                                                        {jurusanName}
                                                    </td>

                                                    {selectedStatus === 'sudah' ? (
                                                        <>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <BadgeKeputusan label={item.keputusan_terbaik || '-'} />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                {item.riwayat_rekomendasi && item.riwayat_rekomendasi.length > 0 ? (
                                                                    item.riwayat_rekomendasi.map((r, i) => (
                                                                        <div key={i} className="mb-1 flex items-center gap-2">
                                                                            <span className="font-bold text-gray-700 w-12">Kls {r.kelas}:</span>
                                                                            <BadgeKeputusan label={r.keputusan} />
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-gray-400 italic">Belum ada riwayat</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 font-mono">
                                                                {getNilaiOptima(item)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                                {item.catatan_guru_bk ? (
                                                                    <span title={item.catatan_guru_bk} className="text-gray-700">{item.catatan_guru_bk}</span>
                                                                ) : (
                                                                    <span className="italic text-gray-300">Belum ada catatan</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => openDetailModal(item)}
                                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md font-bold transition-colors"
                                                                >
                                                                    Detail
                                                                </button>
                                                                <button
                                                                    onClick={() => openModal(item)}
                                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md font-bold transition-colors"
                                                                >
                                                                    {item.catatan_guru_bk ? 'Edit Catatan' : '+ Catatan'}
                                                                </button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
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
                                <div className="text-sm text-gray-500 font-medium">
                                    Total: {results.total} Data
                                </div>
                            )}

                            {results?.links && results.links.length > 3 && (
                                <div className="flex gap-1 flex-wrap">
                                    {results.links.map((link, k) => {
                                        if (!link.url && !link.label) return null;

                                        return (
                                            <button
                                                key={k}
                                                onClick={() => handlePageChange(link.url)}
                                                disabled={!link.url}
                                                className={`px-3 py-1 text-sm rounded font-medium border ${link.active
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                        Catatan untuk: <span className="text-indigo-600">{selectedItem?.user?.name || selectedItem?.name}</span>
                    </h3>
                    <form onSubmit={submitCatatan}>
                        <textarea
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3"
                            rows={5}
                            placeholder="Tuliskan catatan konseling, validasi hasil, atau saran tambahan untuk siswa bersangkutan..."
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

            {/* --- MODAL DETAIL SISWA --- */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">
                            Detail Analisis Siswa
                        </h3>
                        <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                    </div>

                    {loadingDetail ? (
                        <div className="py-10 text-center font-bold text-gray-500">Memuat detail siswa...</div>
                    ) : detailData ? (
                        <div className="space-y-6">
                            {/* Header Profil */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-xl font-bold text-gray-900">{detailData.siswa.name}</h4>
                                <div className="text-sm text-gray-600 flex gap-4 mt-1">
                                    <span><span className="font-semibold">NISN:</span> {detailData.siswa.nisn}</span>
                                    <span><span className="font-semibold">Jurusan:</span> {detailData.siswa.jurusan}</span>
                                </div>
                            </div>

                            {detailData && (
                                <div className="space-y-6">
                                    {/* Bagian Navigasi Riwayat (Tab/Card) */}
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 text-sm uppercase">Pilih Riwayat Kelas</h4>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {detailData.riwayat.map((r: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedRiwayatIdx(i)}
                                                    className={`flex-shrink-0 p-3 rounded-lg border transition-all text-left w-48 ${selectedRiwayatIdx === i
                                                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className={`text-xs font-bold ${selectedRiwayatIdx === i ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                        KELAS {r.kelas}
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900 truncate">{r.keputusan}</div>
                                                    <div className="text-[10px] text-gray-400 mt-1">{r.periode}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bagian Skor & Jawaban Dinamis berdasarkan Riwayat yang dipilih */}
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                            <h4 className="font-bold text-gray-700">Detail Jawaban: Kelas {detailData.riwayat[selectedRiwayatIdx].kelas}</h4>
                                            <BadgeKeputusan label={detailData.riwayat[selectedRiwayatIdx].keputusan} />
                                        </div>

                                        <div className="p-4">
                                            {/* Ringkasan Skor Periode Terpilih */}
                                            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                                                <div className="p-2 bg-blue-50 rounded-md">
                                                    <div className="text-[10px] text-blue-600 font-bold">STUDI</div>
                                                    <div className="font-mono font-bold">{detailData.riwayat[selectedRiwayatIdx].skor_studi}</div>
                                                </div>
                                                <div className="p-2 bg-green-50 rounded-md">
                                                    <div className="text-[10px] text-green-600 font-bold">KERJA</div>
                                                    <div className="font-mono font-bold">{detailData.riwayat[selectedRiwayatIdx].skor_kerja}</div>
                                                </div>
                                                <div className="p-2 bg-orange-50 rounded-md">
                                                    <div className="text-[10px] text-orange-600 font-bold">WIRAUSAHA</div>
                                                    <div className="font-mono font-bold">{detailData.riwayat[selectedRiwayatIdx].skor_wirausaha}</div>
                                                </div>
                                            </div>

                                            {/* Daftar Jawaban Periode Terpilih */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                                {detailData.riwayat[selectedRiwayatIdx].detail_jawaban.length > 0 ? (
                                                    detailData.riwayat[selectedRiwayatIdx].detail_jawaban.map((dj: any, i: number) => (
                                                        <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                                                            <span className="text-gray-500 mr-2">{dj.kriteria}</span>
                                                            <span className="font-semibold text-gray-800 text-right">{dj.nilai}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 text-center py-4 text-gray-400 italic">Data snapshot jawaban tidak tersedia untuk periode ini.</div>
                                                )}
                                            </div>

                                            {/* Catatan BK Periode Terpilih */}
                                            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                                <div className="text-xs font-bold text-yellow-700 mb-1 underline">CATATAN GURU BK (KELAS {detailData.riwayat[selectedRiwayatIdx].kelas}):</div>
                                                <p className="text-sm text-yellow-900 italic">
                                                    {detailData.riwayat[selectedRiwayatIdx].catatan_guru_bk || "Tidak ada catatan untuk periode ini."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-10 text-center font-bold text-red-500">Gagal memuat data.</div>
                    )}
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
        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${classes}`}>
            {label}
        </span>
    );
}