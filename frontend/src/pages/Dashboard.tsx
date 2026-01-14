import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import apiClient from '@/lib/axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import {Line, Doughnut} from 'react-chartjs-2';
import Header from "../components/Header.tsx";

// Register ChartJS Components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

// --- TYPES ---
interface HistoryItem {
    id: number;
    kelas: string;
    label: string; // e.g., "Kelas 10 (2023)"
    skor_studi: number;
    skor_kerja: number;
    skor_wirausaha: number;
    keputusan: string;
    tanggal: string;
}

interface DashboardData {
    role: string;
    // Data Admin
    stats?: {
        total_siswa: number;
        sudah_mengisi: number;
        belum_mengisi: number;
        rekomendasi_studi: number;
        rekomendasi_kerja: number;
        rekomendasi_wirausaha: number;
    };
    chart_distribution?: {
        labels: string[];
        data: number[];
        colors: string[];
    };
    rekapitulasi?: Array<{
        id: number;
        nama: string;
        jurusan: string;
        nilai_optima: number;
        keputusan: string;
        tanggal: string;
    }>;
    // Data Siswa
    history?: HistoryItem[];
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Ambil data user dari localStorage
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.get('/dashboard/stats');
                setData(response.data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (!user) return null;

    if (loading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div
                        className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-10 text-center text-gray-500 flex flex-col items-center justify-center min-h-[300px]">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg"
                             fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memuat data dashboard...
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center text-red-500">Gagal memuat data.</div>;

    // =================================================================================
    // 1. TAMPILAN DASHBOARD SISWA (PORTING DARI LARAVEL)
    // =================================================================================
    if (user.role === 'siswa') {
        const history = data.history || [];
        const latestHistory = history.length > 0 ? history[history.length - 1] : null;

        // Config Line Chart Siswa
        const lineData = {
            labels: history.map((h) => `Kelas ${h.kelas}`),
            datasets: [
                {
                    label: "Minat Studi",
                    data: history.map((h) => h.skor_studi),
                    borderColor: "rgb(79, 70, 229)", // Indigo
                    backgroundColor: "rgba(79, 70, 229, 0.2)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: "Minat Kerja",
                    data: history.map((h) => h.skor_kerja),
                    borderColor: "rgb(16, 185, 129)", // Emerald
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: "Minat Wirausaha",
                    data: history.map((h) => h.skor_wirausaha),
                    borderColor: "rgb(249, 115, 22)", // Orange
                    backgroundColor: "rgba(249, 115, 22, 0.2)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
            ],
        };

        const lineOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index' as const,
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: {usePointStyle: true, padding: 20},
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    padding: 12,
                    titleFont: {size: 14},
                    bodyFont: {size: 13},
                },
            },
            scales: {
                x: {grid: {display: false}},
                y: {
                    min: 0,
                    max: 1,
                    grid: {borderDash: [5, 5], color: "#e5e7eb"},
                    ticks: {padding: 10},
                },
            },
        };

        return (
            <>
                <Header>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Dashboard {user.role === 'admin' ? 'Admin' : (user.role === 'pakar' ? 'Pakar' : 'Siswa')}
                    </h2>
                </Header>
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">

                        {/* A. WELCOME BANNER */}
                        <div
                            className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold">Halo, {user.name}! 👋</h3>
                                <p className="mt-2 text-indigo-100 max-w-2xl">
                                    Selamat datang di Sistem Pendukung Keputusan Karir. Pantau terus perkembangan
                                    potensimu
                                    dari tahun ke tahun untuk masa depan yang lebih cerah.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <Link to="/siswa/input"
                                          className="px-5 py-2.5 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition shadow-sm inline-block">
                                        📝 Update Data Baru
                                    </Link>
                                    <Link to="/siswa/result"
                                          className="px-5 py-2.5 bg-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-800 transition border border-indigo-500 inline-block">
                                        📄 Lihat Hasil Terakhir
                                    </Link>
                                </div>
                            </div>
                            {/* Dekorasi Background */}
                            <div
                                className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-5 transform skew-x-12"></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* B. BAGIAN KIRI (GRAFIK) */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                        </svg>
                                        Grafik Perkembangan Minat
                                    </h3>
                                    <span
                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">History Kelas 10-12</span>
                                </div>
                                {history.length > 0 ? (
                                    <div className="h-80 w-full">
                                        <Line options={lineOptions} data={lineData}/>
                                    </div>
                                ) : (
                                    <div
                                        className="h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                                        <p>Belum ada data history.</p>
                                    </div>
                                )}
                            </div>

                            {/* C. BAGIAN KANAN (RINGKASAN SKOR TERAKHIR) */}
                            <div
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Status Terakhir</h3>
                                {latestHistory ? (
                                    <div className="space-y-4">
                                        <div
                                            className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                                            <div
                                                className="text-sm text-indigo-600 font-medium uppercase tracking-wide">Rekomendasi
                                                Utama
                                            </div>
                                            <div
                                                className="text-2xl font-extrabold text-indigo-700 mt-1 leading-tight">{latestHistory.keputusan}</div>
                                            <div className="text-xs text-indigo-500 mt-2">Periode:
                                                Kelas {latestHistory.kelas}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Minat Studi</span>
                                                <span
                                                    className="font-bold">{latestHistory.skor_studi?.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Minat Kerja</span>
                                                <span
                                                    className="font-bold">{latestHistory.skor_kerja?.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Wirausaha</span>
                                                <span
                                                    className="font-bold">{latestHistory.skor_wirausaha?.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-center text-sm">Data tidak tersedia.</p>
                                )}
                            </div>
                        </div>

                        {/* D. TABEL RIWAYAT PENILAIAN */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Riwayat Penilaian Lengkap
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode
                                            / Kelas
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor
                                            Studi
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor
                                            Kerja
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor
                                            Wirausaha
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keputusan
                                            Sistem
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {history.length > 0 ? (
                                        history.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{item.label}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.skor_studi?.toFixed(4)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.skor_kerja?.toFixed(4)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.skor_wirausaha?.toFixed(4)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <BadgeKeputusan label={item.keputusan}/>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Link to={`/siswa/result?id=${item.id}`}
                                                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium hover:underline">
                                                        Lihat Detail &rarr;
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Belum
                                                ada
                                                data riwayat.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </>

        );
    }

    // =================================================================================
    // 2. TAMPILAN DASHBOARD ADMIN / PAKAR (SESUAI REQUEST SEBELUMNYA)
    // =================================================================================

    // Ambil data admin, pastikan tidak error jika null (safety check)
    const stats = data.stats || {
        total_siswa: 0,
        sudah_mengisi: 0,
        belum_mengisi: 0,
        rekomendasi_studi: 0,
        rekomendasi_kerja: 0,
        rekomendasi_wirausaha: 0
    };
    const chart_distribution = data.chart_distribution || {labels: [], data: [], colors: []};
    const rekapitulasi = data.rekapitulasi || [];

    const doughnutData = {
        labels: chart_distribution.labels.length ? chart_distribution.labels : ['Studi', 'Bekerja', 'Wirausaha'],
        datasets: [{
            data: chart_distribution.data.length ? chart_distribution.data : [0, 0, 0],
            backgroundColor: chart_distribution.colors.length ? chart_distribution.colors : ['#4f46e5', '#10b981', '#f97316'],
            borderWidth: 0,
            hoverOffset: 4,
        }],
    };

    const doughnutOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {display: false},
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = Math.round((value / total) * 100) + '%';
                        return `${label}: ${value} Siswa (${percentage})`;
                    }
                }
            }
        },
        cutout: '70%',
    };

    return (
        <>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Dashboard {user.role === 'admin' ? 'Admin' : (user.role === 'pakar' ? 'Pakar' : 'Siswa')}
                </h2>
            </Header>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Siswa" value={stats.total_siswa} color="bg-blue-50" textColor="text-blue-700"
                            icon={<svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor"
                                       viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                            </svg>}
                        />
                        <StatCard
                            title="Sudah Dinilai" value={stats.sudah_mengisi} color="bg-green-50"
                            textColor="text-green-700"
                            icon={<svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor"
                                       viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>}
                        />
                        <StatCard
                            title="Belum Mengisi" value={stats.belum_mengisi} color="bg-red-50" textColor="text-red-700"
                            icon={<svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor"
                                       viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>}
                        />
                        <StatCard
                            title="Dominasi Hasil" value={getMaxLabel(stats)} color="bg-purple-50"
                            textColor="text-purple-700"
                            icon={<svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor"
                                       viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* PIE CHART SECTION */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Distribusi Rekomendasi Karir</h3>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Real-time</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-around h-64">
                                <div className="h-full w-full sm:w-1/2 flex justify-center relative">
                                    <Doughnut data={doughnutData} options={doughnutOptions}/>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <span
                                                className="text-3xl font-bold text-gray-700">{stats.sudah_mengisi}</span>
                                            <p className="text-xs text-gray-400 uppercase">Total Data</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 sm:mt-0 space-y-4 w-full sm:w-1/3">
                                    <LegendItem color="bg-indigo-600" label="Melanjutkan Studi"
                                                value={stats.rekomendasi_studi} total={stats.sudah_mengisi}/>
                                    <LegendItem color="bg-emerald-500" label="Bekerja" value={stats.rekomendasi_kerja}
                                                total={stats.sudah_mengisi}/>
                                    <LegendItem color="bg-orange-500" label="Wirausaha"
                                                value={stats.rekomendasi_wirausaha} total={stats.sudah_mengisi}/>
                                </div>
                            </div>
                        </div>

                        {/* SIDEBAR WIDGET */}
                        <div className="space-y-6">
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</h3>
                                {stats.belum_mengisi > 0 && (
                                    <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20"
                                                     fill="currentColor">
                                                    <path fillRule="evenodd"
                                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                          clipRule="evenodd"/>
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-amber-700">Ada <span
                                                    className="font-bold">{stats.belum_mengisi} siswa</span> yang belum
                                                    mengisi penilaian.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {user.role === 'admin' ? (
                                        <>
                                            <Link to="/admin/monitoring"
                                                  className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 transition">Monitoring
                                                Siswa</Link>
                                            <Link to="/admin/settings"
                                                  className="flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 transition">Pengaturan
                                                Sistem</Link>
                                        </>
                                    ) : (
                                        <Link to="/pakar/bwm"
                                              className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 transition">Input
                                            Bobot (BWM)</Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABLE REKAPITULASI */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Aktifitas Penilaian Terbaru</h3>
                            <Link to="/admin/monitoring"
                                  className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">Lihat
                                Semua &rarr;</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama
                                        Siswa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurusan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai
                                        Optima
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keputusan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {rekapitulasi.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">Belum
                                            ada data penilaian siswa.
                                        </td>
                                    </tr>
                                ) : (
                                    rekapitulasi.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div
                                                        className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{item.nama.charAt(0)}</div>
                                                    <div className="ml-4">
                                                        <div
                                                            className="text-sm font-medium text-gray-900">{item.nama}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.jurusan}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.nilai_optima ? item.nilai_optima.toFixed(4) : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><BadgeKeputusan
                                                label={item.keputusan}/></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}

// ----------------------------------------------------------------------
// SUB COMPONENTS
// ----------------------------------------------------------------------

function StatCard({title, value, color, textColor, icon}: any) {
    return (
        <div
            className={`p-6 rounded-lg shadow-sm border border-gray-100 bg-white flex items-center justify-between transition hover:shadow-md`}>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                <p className={`text-3xl font-extrabold ${textColor}`}>{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        </div>
    );
}

function LegendItem({color, label, value, total}: any) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center justify-between text-sm w-full group">
            <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${color} ring-2 ring-white shadow-sm`}></span>
                <span className="text-gray-600 font-medium group-hover:text-gray-900 transition">{label}</span>
            </div>
            <div className="text-right">
                <span className="font-bold text-gray-800 block">{value}</span>
                <span className="text-xs text-gray-400 block">({percent}%)</span>
            </div>
        </div>
    );
}

function BadgeKeputusan({label}: { label: string }) {
    let classes = "bg-gray-100 text-gray-800";
    if (label === 'Melanjutkan Studi' || label.includes('Studi')) classes = "bg-indigo-100 text-indigo-800 border border-indigo-200";
    else if (label === 'Bekerja' || label.includes('Kerja')) classes = "bg-emerald-100 text-emerald-800 border border-emerald-200";
    else if (label === 'Berwirausaha') classes = "bg-orange-100 text-orange-800 border border-orange-200";

    return (
        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}`}>
            {label}
        </span>
    );
}

function getMaxLabel(stats: any) {
    if (!stats) return "-";
    const maxVal = Math.max(stats.rekomendasi_studi, stats.rekomendasi_kerja, stats.rekomendasi_wirausaha);
    if (maxVal === 0) return "-";
    if (maxVal === stats.rekomendasi_studi) return "Studi";
    if (maxVal === stats.rekomendasi_kerja) return "Kerja";
    return "Wirausaha";
}