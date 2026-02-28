import { useState, useEffect } from 'react';
import type { FormEventHandler } from 'react';
import InputLabel from '../components/InputLabel';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import { useNavigate } from 'react-router-dom';
import apiClient from "../lib/axios.ts";
import { useLayout } from '@/contexts/useLayout.ts';

interface Jurusan {
    id: number;
    nama_jurusan: string;
}

export default function Register() {
    const navigate = useNavigate();
    const { refreshUser } = useLayout();
    const [schoolName, setSchoolName] = useState('SMK Negeri 1 Gorontalo');
    const [jurusans, setJurusans] = useState<Jurusan[]>([]);

    const [data, setData] = useState({
        name: '',
        nisn: '',
        password: '',
        password_confirmation: '',
        jurusan_id: '',
        kelas: '',
    });
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        
        if (data.password !== data.password_confirmation) {
            setErrorMsg('Password dan Konfirmasi Password tidak cocok!');
            return;
        }

        setProcessing(true);
        setErrorMsg('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: data.name,
                    nisn: data.nisn,
                    password: data.password,
                    jurusan_id: data.jurusan_id,
                    kelas: data.kelas
                }),
            });

            const result = await response.json();

            if (response.ok) {
                // Registrasi Sukses & Langsung Auto-Login
                localStorage.setItem('token', result.token);
                if (result.refresh_token) {
                    localStorage.setItem('refresh_token', result.refresh_token);
                }
                
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('role', result.user.role);

                refreshUser();

                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 100);
            } else {
                setErrorMsg(result.msg || 'Terjadi kesalahan saat mendaftar.');
            }
        } catch (error) {
            setErrorMsg('Gagal menghubungi server backend.');
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        document.title = "Daftar Akun Siswa - SPK Karir";
        
        // Ambil Setting Sekolah
        apiClient.get('/settings')
            .then(res => {
                if (res.data.nama_sekolah) {
                    setSchoolName(res.data.nama_sekolah);
                }
            })
            .catch(err => console.error("Gagal mengambil pengaturan sekolah", err));

        // Ambil Daftar Jurusan untuk Dropdown
        apiClient.get('/jurusan')
            .then(res => {
                // Sesuaikan jika response dibungkus objek { data: [...] }
                const jurusanData = res.data.data ? res.data.data : res.data;
                console.log(jurusanData)
                setJurusans(jurusanData);
            })
            .catch(err => console.error("Gagal mengambil data jurusan", err));
    }, []);

    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gradient-to-br from-blue-500 to-indigo-700 py-10">
            <div className="text-white text-2xl text-center font-bold mb-4">
                Sistem Pendukung Keputusan <br /> Penentuan Karir {schoolName}
            </div>

            <div className="w-full sm:max-w-md mt-6 px-8 py-10 bg-white shadow-2xl overflow-hidden sm:rounded-xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">Daftar Akun</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Lengkapi data diri Anda sebagai Siswa
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 font-medium text-sm text-red-600 bg-red-100 p-2 rounded text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={submit}>
                    <div>
                        <InputLabel value="Nama Lengkap" />
                        <TextInput
                            id="name"
                            type="text"
                            name="name"
                            value={data.name}
                            className="mt-1 block w-full"
                            required
                            autoFocus
                            onChange={(e) => setData({ ...data, name: e.target.value })}
                        />
                    </div>

                    <div className="mt-4">
                        <div>
                            <InputLabel value="NISN" />
                            <TextInput
                                id="nisn"
                                type="text"
                                name="nisn"
                                value={data.nisn}
                                className="mt-1 block w-full"
                                required
                                onChange={(e) => setData({ ...data, nisn: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Jurusan" />
                        <select
                            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm mt-1 block w-full"
                            required
                            value={data.jurusan_id}
                            onChange={(e) => setData({ ...data, jurusan_id: e.target.value })}
                        >
                            <option value="" disabled>-- Pilih Jurusan --</option>
                            {jurusans.map((j) => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Kelas Saat Ini" />
                        <select
                            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm mt-1 block w-full"
                            required
                            value={data.kelas}
                            onChange={(e) => setData({ ...data, kelas: e.target.value })}
                        >
                            <option value="" disabled>-- Pilih Kelas --</option>
                            <option value="10">Kelas 10</option>
                            <option value="11">Kelas 11</option>
                            <option value="12">Kelas 12</option>
                        </select>
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Password" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            required
                            onChange={(e) => setData({ ...data, password: e.target.value })}
                        />
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Konfirmasi Password" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full"
                            required
                            onChange={(e) => setData({ ...data, password_confirmation: e.target.value })}
                        />
                    </div>

                    <div className="mt-6">
                        <PrimaryButton className="w-full justify-center py-3 text-lg" disabled={processing}>
                            {processing ? 'Sedang Mendaftar...' : 'Daftar Sekarang'}
                        </PrimaryButton>
                    </div>

                    <div className="mt-6 text-center">
                        <span className="text-sm text-gray-600">
                            Sudah punya akun?
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="ml-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition"
                        >
                            Masuk di sini
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}