import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/axios';

export default function Welcome() {
    const [user, setUser] = useState<any>(null);
    const [schoolName, setSchoolName] = useState('SMK Negeri 1 Gorontalo'); // Default value

    useEffect(() => {
        // 1. Set Title Browser
        document.title = "SPK Penentuan Karir SMK";

        // 2. Cek Status Login dari LocalStorage
        const userString = localStorage.getItem('user');
        if (userString) {
            setUser(JSON.parse(userString));
        }

        // 3. Ambil Nama Sekolah dari Backend API
        apiClient.get('/settings')
            .then(res => {
                if (res.data.nama_sekolah) {
                    setSchoolName(res.data.nama_sekolah);
                }
            })
            .catch(err => console.error("Gagal mengambil pengaturan sekolah", err));
    }, []);

    return (
        <>
            <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-indigo-500 selection:text-white">

                {/* NAVBAR */}
                <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm sm:px-12">
                    <div className="text-2xl font-bold tracking-tighter text-indigo-600">
                        SPK{" "}<span className="text-gray-900"> {schoolName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="font-semibold text-gray-600 hover:text-indigo-600 transition"
                            >
                                Log in
                            </Link>
                        )}
                    </div>
                </nav>

                {/* HERO SECTION */}
                <header className="container mx-auto px-6 py-16 text-center md:py-24 lg:px-12">
                    <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl mb-6">
                        Tentukan Masa Depan Karirmu <br />
                        <span className="text-indigo-600">Secara Ilmiah & Tepat</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-10">
                        Sistem Pendukung Keputusan untuk siswa {schoolName} menggunakan integrasi metode
                        <strong> Best Worst Method (BWM)</strong> untuk pembobotan dan
                        <strong> MOORA</strong> untuk perankingan rekomendasi.
                    </p>
                    <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                        <Link
                            to={user ? "/dashboard" : "/login"}
                            className="inline-flex justify-center items-center px-8 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
                        >
                            Mulai Sekarang
                        </Link>
                        <a
                            href="#tentang"
                            className="inline-flex justify-center items-center px-8 py-3 text-lg font-semibold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition"
                        >
                            Pelajari Metode
                        </a>
                    </div>
                </header>

                {/* FEATURES / METHOD EXPLANATION */}
                <section id="tentang" className="bg-white py-16 border-t border-gray-100">
                    <div className="container mx-auto px-6 lg:px-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* Card 1 */}
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold">
                                    1
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Input Kriteria</h3>
                                <p className="text-gray-600">
                                    Pakar menentukan kriteria penilaian dan bobot menggunakan metode BWM untuk memastikan prioritas yang valid.
                                </p>
                            </div>
                            {/* Card 2 */}
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold">
                                    2
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Penilaian Siswa</h3>
                                <p className="text-gray-600">
                                    Siswa memasukkan nilai akademik, minat, dan kondisi ekonomi sebagai bahan pertimbangan sistem.
                                </p>
                            </div>
                            {/* Card 3 */}
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4 text-xl font-bold">
                                    3
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Hasil Rekomendasi</h3>
                                <p className="text-gray-600">
                                    Metode MOORA mengkalkulasi skor optimasi untuk memberikan saran: Kuliah, Kerja, atau Wirausaha.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="bg-gray-900 text-gray-300 py-8">
                    <div className="container mx-auto px-6 text-center">
                        <p>&copy; 2025 Nur Alim M. Suma. Universitas Negeri Gorontalo.</p>
                        <p className="text-sm mt-2 text-gray-500">Program Studi Sistem Informasi</p>
                    </div>
                </footer>
            </div>
        </>
    );
}