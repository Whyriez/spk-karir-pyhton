import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '@/components/Modal';
import SecondaryButton from '@/components/SecondaryButton';
import apiClient from '@/lib/axios';
import Header from "../../components/Header.tsx";

// --- IMPORT UNTUK GRAFIK (PROGRESS CHART) ---
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Registrasi komponen ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Tipe Data untuk Riwayat (Snapshot)
interface SnapshotItem {
    kriteria_kode: string;
    kriteria_nama: string;
    pertanyaan_teks: string;
    jawaban_nilai: number;
}

export default function ResultSiswa() {
    const [data, setData] = useState<any>(null);
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAlumniModalOpen, setIsAlumniModalOpen] = useState(false);

    // State untuk Toggle Riwayat Jawaban
    const [showHistory, setShowHistory] = useState(false);

    const [searchParams] = useSearchParams();
    const historyId = searchParams.get('id');

    // 1. Ambil Data Hasil MOORA dan Data Monitoring
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const resultUrl = historyId ? `/moora/result?id=${historyId}` : '/moora/result';
                const resResult = await apiClient.get(resultUrl);
                setData(resResult.data);

                const resChart = await apiClient.get('/monitoring/chart-data');
                setChartData(resChart.data);
            } catch (err) {
                console.error("Gagal mengambil data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [historyId]);

    // Helper: Grouping Riwayat Jawaban berdasarkan Kriteria
    const groupHistoryByKriteria = (history: SnapshotItem[]) => {
        if (!history || !Array.isArray(history)) return {};
        const grouped: Record<string, SnapshotItem[]> = {};

        history.forEach(item => {
            // Grouping key: "C1 - Minat"
            const key = `${item.kriteria_kode} - ${item.kriteria_nama}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });

        return grouped;
    };

    // 2. Loading State
    if (loading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-10 text-center text-gray-500 flex flex-col items-center justify-center min-h-[300px]">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memuat analisis data...
                    </div>
                </div>
            </div>
        );
    }

    // 3. Handle Jika Belum Ada Data
    if (!data || !data.hasil) {
        return (
            <>
                <Header><h2 className="font-semibold text-xl text-gray-800 leading-tight">Laporan Hasil Analisis Karir</h2></Header>
                <div className="py-20 text-center px-4">
                    <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Data Penilaian Belum Tersedia</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Silakan isi kuesioner terlebih dahulu untuk melihat hasil analisis.</p>
                    <Link to="/siswa/input" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold inline-block">Mulai Input Data</Link>
                </div>
            </>
        );
    }

    const { hasil, alumni, periode } = data;
    const alumni_relevan = alumni || [];
    const keputusan = hasil.keputusan || '';

    // Ambil history dari response backend
    const riwayatJawaban = hasil.riwayat_jawaban || [];
    const groupedHistory = groupHistoryByKriteria(riwayatJawaban);

    // 4. Tema Visual Dinamis
    let themeClass = 'border-gray-500 text-gray-700';
    let bgClass = 'bg-gray-50';
    let description = '';

    if (keputusan.includes('Studi')) {
        themeClass = 'border-indigo-500 text-indigo-700'; bgClass = 'bg-indigo-50';
        description = 'Sistem merekomendasikan Anda untuk melanjutkan pendidikan tinggi berdasarkan potensi akademik dan minat studi yang Anda miliki.';
    } else if (keputusan.includes('Kerja') || keputusan.includes('Bekerja')) {
        themeClass = 'border-emerald-500 text-emerald-700'; bgClass = 'bg-emerald-50';
        description = 'Analisis menunjukkan kesiapan kerja praktis Anda sangat kuat. Memasuki dunia industri adalah pilihan strategis bagi Anda.';
    } else if (keputusan.includes('Berwirausaha')) {
        themeClass = 'border-orange-500 text-orange-700'; bgClass = 'bg-orange-50';
        description = 'Anda memiliki jiwa entrepreneurship yang tinggi didukung dengan kesiapan modal yang memadai untuk merintis usaha sendiri.';
    }

    // --- KONFIGURASI GRAFIK ---
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const },
            tooltip: { mode: 'index' as const, intersect: false },
        },
        scales: {
            y: { min: 0, max: 1, title: { display: true, text: 'Nilai Optimasi MOORA' } }
        },
    };

    const formattedChartData = chartData ? {
        labels: chartData.labels,
        datasets: chartData.datasets.map((ds: any) => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.color,
            backgroundColor: ds.color + '20',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
        }))
    } : null;

    return (
        <div>
            <Header><h2 className="font-semibold text-xl text-gray-800 leading-tight">Laporan Hasil Analisis Karir</h2></Header>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">

                    {/* PERIODE INFO */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-blue-500 uppercase">Periode Penilaian</span>
                            <h3 className="text-lg font-bold text-gray-800">{periode}</h3>
                            <p className="text-sm text-gray-500 italic">Tingkat Kelas: {hasil.tingkat_kelas || '-'}</p>
                        </div>
                        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 underline font-medium">Lihat Riwayat Lainnya</Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">

                            {/* KARTU REKOMENDASI UTAMA */}
                            <div className={`bg-white shadow-lg rounded-xl border-t-8 ${themeClass.split(' ')[0]} p-8 text-center`}>
                                <h3 className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-3">Rekomendasi Utama</h3>
                                <div className={`text-3xl md:text-5xl font-extrabold mb-4 py-4 px-6 rounded-xl inline-block ${bgClass} ${themeClass}`}>
                                    {keputusan.toUpperCase()}
                                </div>
                                <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">{description}</p>
                            </div>

                            {/* --- PROGRESS CHART: MONITORING LONGITUDINAL  --- */}
                            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-2 mb-6 pb-2 border-b">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                    </svg>
                                    <h3 className="font-bold text-gray-800">Tren Perkembangan Minat (Kelas 10 - 12)</h3>
                                </div>
                                <div className="h-72">
                                    {formattedChartData ? (
                                        <Line options={chartOptions} data={formattedChartData} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 italic">Data histori belum cukup untuk menampilkan tren.</div>
                                    )}
                                </div>
                            </div>

                            {/* BAGIAN BARU: RIWAYAT JAWABAN (DETAIL SNAPSHOT) */}
                            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        <h3 className="font-bold text-gray-800">Detail Jawaban Anda</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition"
                                    >
                                        {showHistory ? "Sembunyikan" : "Tampilkan Detail"}
                                    </button>
                                </div>

                                {showHistory && (
                                    <div className="p-6 bg-gray-50/50">
                                        {Object.keys(groupedHistory).length > 0 ? (
                                            <div className="space-y-6">
                                                {Object.entries(groupedHistory).map(([kriteriaKey, items]) => (
                                                    <div key={kriteriaKey} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                        <h4 className="font-bold text-sm text-indigo-700 border-b border-gray-100 pb-2 mb-3">
                                                            Kriteria: {kriteriaKey}
                                                        </h4>
                                                        <div className="grid gap-3">
                                                            {items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-start text-sm group">
                                                                    <div className="pr-4 text-gray-600">
                                                                        <span className="font-mono text-gray-400 text-xs mr-2">{idx + 1}.</span>
                                                                        {item.pertanyaan_teks}
                                                                    </div>
                                                                    <div className="flex-shrink-0">
                                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                            Nilai: {item.jawaban_nilai}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-400 italic">
                                                <p>Tidak ada data detail riwayat jawaban untuk sesi ini.</p>
                                                <p className="text-xs mt-1">Data detail mungkin belum tersimpan pada versi sistem sebelumnya.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* JEJAK ALUMNI RELEVAN  */}
                            {alumni_relevan.length > 0 && (
                                <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        Referensi Jejak Alumni
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {alumni_relevan.slice(0, 3).map((a: any, i: number) => (
                                            <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="font-bold text-gray-800 text-sm truncate">{a.name}</div>
                                                <div className="text-xs text-indigo-600 font-semibold">{a.status}</div>
                                                <div className="text-[10px] text-gray-400">Angkatan {a.batch}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {alumni_relevan.length > 3 && (
                                        <button onClick={() => setIsAlumniModalOpen(true)} className="mt-4 text-sm text-indigo-600 font-medium hover:underline">Lihat Semua Alumni...</button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* DETAIL SKOR MOORA (KANAN)  */}
                        <div className="space-y-6">
                            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-6 pb-2 border-b">Detail Skor MOORA</h3>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Studi Lanjut', key: 'studi', color: 'bg-indigo-600', text: 'text-indigo-600' },
                                        { label: 'Dunia Kerja', key: 'kerja', color: 'bg-emerald-500', text: 'text-emerald-600' },
                                        { label: 'Wirausaha', key: 'wirausaha', color: 'bg-orange-500', text: 'text-orange-600' }
                                    ].map(item => (
                                        <div key={item.key}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-gray-600">{item.label}</span>
                                                <span className={`font-bold ${item.text}`}>{hasil.skor[item.key]?.toFixed(4)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${Math.min(hasil.skor[item.key] * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => window.print()} className="w-full mt-8 py-2.5 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-700 transition">Cetak Laporan PDF</button>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 text-sm mb-1 italic">Butuh Konsultasi?</h4>
                                <p className="text-[11px] text-blue-700 leading-relaxed">Hasil ini bersifat pendukung keputusan. Silakan diskusikan lebih lanjut dengan Guru BK Anda.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL ALUMNI */}
            <Modal show={isAlumniModalOpen} onClose={() => setIsAlumniModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Daftar Alumni Relevan</h2>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                        {alumni_relevan.map((a: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-gray-50 rounded border">
                                <div>
                                    <div className="font-bold">{a.name}</div>
                                    <div className="text-xs text-gray-500">Angkatan {a.batch}</div>
                                </div>
                                <div className="text-sm font-semibold text-indigo-600">{a.status}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setIsAlumniModalOpen(false)}>Tutup</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}