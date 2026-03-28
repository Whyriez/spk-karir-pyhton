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

export default function MonitoringIndex() {
    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<PaginationData | null>(null);
    const [periodes, setPeriodes] = useState<Periode[]>([]);
    const [jurusans, setJurusans] = useState<Jurusan[]>([]);

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

    // State Modal Export Custom
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportTarget, setExportTarget] = useState<'admin' | 'pakar'>('pakar');
    const [exportConfig, setExportConfig] = useState({
        limit10: '',
        limit11: '',
        limit12: '',
        balanced: true
    });

    // Ambil Data Jurusan Sekali Saat Mount
    useEffect(() => {
        apiClient.get('/jurusan').then(res => {
            if (res.data && res.data.data) {
                setJurusans(res.data.data);
            }
        }).catch(err => console.error(err));
    }, []);

    const openExportModal = (target: 'admin' | 'pakar') => {
        setExportTarget(target);
        setIsExportModalOpen(true);
    };

    const handlePrintUAT = async () => {
        try {
            const response = await apiClient.get('/monitoring/export-uat', {
                params: {
                    periode_id: selectedPeriode,
                    kelas: selectedKelas,
                    jurusan_id: selectedJurusan, 
                    limit_10: exportConfig.limit10 || 0,
                    limit_11: exportConfig.limit11 || 0,
                    limit_12: exportConfig.limit12 || 0,
                    balanced: exportConfig.balanced
                }
            });
            
            let data = response.data.data;

            // --- PENGECUALIAN DATA ALIM SUMA ---
            data = data.filter((item: any) => item.name?.toLowerCase() !== 'alim suma');

            if (data.length === 0) {
                alert("Tidak ada data siswa untuk kriteria filter ini (atau semua data merupakan akun dummy).");
                return;
            }

            const isPakar = exportTarget === 'pakar';
            const title = isPakar ? 'LEMBAR VALIDASI PAKAR (BLIND TEST)' : 'LEMBAR REKAPITULASI UAT (SISTEM VS PAKAR)';
            const desc = isPakar
                ? 'Mohon berikan rekomendasi karir (Melanjutkan Studi / Bekerja / Berwirausaha) berdasarkan profil indikator masing-masing siswa.'
                : 'Digunakan untuk rekapitulasi perhitungan Confusion Matrix pengujian fungsionalitas sistem.';

            const printContents = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; color: #1f2937; line-height: 1.5; background: #fff; }
                        @media print {
                            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            tfoot { display: table-footer-group; }
                        }
                        .kop-header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
                        .kop-header h2 { margin: 0 0 5px 0; font-size: 18px; color: #111827; letter-spacing: 0.5px; }
                        .kop-header p { margin: 0; color: #6b7280; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 10px; vertical-align: top; }
                        th { background-color: #f3f4f6; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 11px; text-align: left; }
                        tbody tr:nth-child(even) { background-color: #f9fafb; }
                        .siswa-name { font-size: 13px; font-weight: 700; color: #111827; }
                        .siswa-nisn { font-size: 11px; color: #6b7280; margin-top: 4px; }
                        .siswa-kelas { font-size: 11px; font-weight: 600; color: #4f46e5; margin-top: 4px; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; display: inline-block; }
                        .jawaban-list { list-style: none; margin: 0; padding: 0; }
                        .jawaban-list li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; }
                        .jawaban-list li:last-child { border-bottom: none; padding-bottom: 0; }
                        .k-label { color: #4b5563; max-width: 60%; }
                        .k-val { font-weight: 600; color: #111827; text-align: right; max-width: 40%; }
                        .tf-container { display: flex; flex-direction: column; gap: 10px; margin-top: 5px; }
                        .tf-item { display: flex; align-items: center; font-size: 12px; font-weight: 600; color: #4b5563; }
                        .box { width: 14px; height: 14px; border: 1.5px solid #9ca3af; border-radius: 3px; margin-right: 8px; background: #fff; }
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
                                <th style="width: 20%;">Identitas Siswa</th>
                                <th style="width: ${isPakar ? '47%' : '37%'};">Profil Jawaban / Kriteria Analisis</th>
                                ${!isPakar ? `<th style="width: 15%;">Rekomendasi Sistem</th>` : ''}
                                <th style="width: ${isPakar ? '20%' : '15%'};">Rekomendasi Pakar</th>
                                <th style="width: 10%; text-align: center;">Sesuai?</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any, i: number) => {
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
                                        <div class="siswa-kelas">Kelas ${item.kelas || item.tingkat_kelas || '-'}</div>
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
                }, 700);
            }
            setIsExportModalOpen(false);
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
                    kelas: selectedKelas,
                    jurusan_id: selectedJurusan,
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
    }, [searchTerm, selectedPeriode, selectedStatus, selectedKelas, selectedJurusan]);

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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
                            </div>

                            {/* Tombol PDF di Baris Bawah */}
                            {selectedStatus === 'sudah' && (
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <button
                                        onClick={() => openExportModal('pakar')}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-indigo-100 transition ease-in-out duration-150"
                                    >
                                        📄 Unduh PDF Validasi Pakar
                                    </button>
                                    <button
                                        onClick={() => openExportModal('admin')}
                                        className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-gray-100 transition ease-in-out duration-150"
                                    >
                                        📊 Unduh PDF Rekapitulasi Admin
                                    </button>
                                </div>
                            )}
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                                <div className="flex gap-1">
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
                            <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Catatan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>


            {/* --- MODAL EXPORT UAT CUSTOM --- */}
            <Modal show={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 pb-3 border-b border-gray-100">
                        Pengaturan Unduh PDF ({exportTarget === 'pakar' ? 'Validasi Pakar' : 'Rekapitulasi Admin'})
                    </h3>
                    <p className="text-sm text-gray-500 mb-5">
                        Anda dapat membatasi jumlah data yang diunduh. Biarkan kosong jika ingin mengunduh <b>semua data</b> sesuai filter di atas.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Kelas 10</label>
                            <input type="number" min="0"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                placeholder="Cth: 15"
                                value={exportConfig.limit10}
                                onChange={e => setExportConfig({ ...exportConfig, limit10: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Kelas 11</label>
                            <input type="number" min="0"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                placeholder="Cth: 15"
                                value={exportConfig.limit11}
                                onChange={e => setExportConfig({ ...exportConfig, limit11: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Kelas 12</label>
                            <input type="number" min="0"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                placeholder="Cth: 15"
                                value={exportConfig.limit12}
                                onChange={e => setExportConfig({ ...exportConfig, limit12: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mb-6 flex items-start p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center h-5">
                            <input type="checkbox" id="balanced"
                                className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                checked={exportConfig.balanced}
                                onChange={e => setExportConfig({ ...exportConfig, balanced: e.target.checked })}
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="balanced" className="font-semibold text-indigo-900 cursor-pointer">
                                Variasikan Hasil Keputusan (Direkomendasikan)
                            </label>
                            <p className="text-indigo-700 mt-1">Sistem akan berusaha membagi rata siswa dengan hasil rekomendasi Melanjutkan Studi, Bekerja, dan Berwirausaha. Jika salah satu hasil kurang, akan otomatis diisi oleh sisa hasil lainnya.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsExportModalOpen(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton onClick={handlePrintUAT}>
                            Generate PDF
                        </PrimaryButton>
                    </div>
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