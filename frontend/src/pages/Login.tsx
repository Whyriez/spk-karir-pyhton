import {useState, useEffect} from 'react';
import type {FormEventHandler} from 'react';
import Checkbox from '../components/Checkbox';
import InputLabel from '../components/InputLabel';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import {useNavigate} from 'react-router-dom';
import {useLayout} from '@/contexts/LayoutContext';
import apiClient from "../lib/axios.ts";

export default function Login() {
    const navigate = useNavigate();
    const {refreshUser} = useLayout(); // Get refresh method from context
    const [schoolName, setSchoolName] = useState('SMK Negeri 1 Gorontalo');

    const [data, setData] = useState({
        login_id: '',
        password: '',
        remember: false,
    });
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrorMsg('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Login Sukses - Simpan data
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('role', result.user.role); // Simpan role juga

                // Refresh context agar user ter-update
                refreshUser();

                // Small delay untuk ensure context updated
                setTimeout(() => {
                    navigate('/dashboard', {replace: true});
                }, 100);
            } else {
                // Login Gagal
                setErrorMsg(result.msg || 'Terjadi kesalahan saat login.');
            }
        } catch (error) {
            setErrorMsg('Gagal menghubungi server backend.');
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        // 1. Set Title Browser
        document.title = "SPK Penentuan Karir SMK";

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
        <div
            className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gradient-to-br from-blue-500 to-indigo-700">
            {/* Logo atau Judul */}
            <div className="text-white text-2xl font-bold mb-4">
                SPK KARIR
            </div>

            <div className="w-full sm:max-w-md mt-6 px-8 py-10 bg-white shadow-2xl overflow-hidden sm:rounded-xl">

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">Selamat Datang</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Silakan masuk untuk melanjutkan
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 font-medium text-sm text-red-600 bg-red-100 p-2 rounded text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={submit}>
                    <div>
                        <InputLabel value="Email atau Username/NISN"/>
                        <TextInput
                            id="login_id"
                            type="text"
                            name="login_id"
                            value={data.login_id}
                            className="mt-1 block w-full"
                            autoComplete="username"
                            autoFocus
                            onChange={(e) => setData({...data, login_id: e.target.value})}
                        />
                    </div>

                    <div className="mt-4">
                        <InputLabel value="Password"/>
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(e) => setData({...data, password: e.target.value})}
                        />
                    </div>

                    <div className="block mt-4 flex justify-between items-center">
                        <label className="flex items-center">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData({...data, remember: e.target.checked})}
                            />
                            <span className="ml-2 text-sm text-gray-600">Ingat Saya</span>
                        </label>
                    </div>

                    <div className="mt-6">
                        <PrimaryButton className="w-full justify-center py-3 text-lg" disabled={processing}>
                            {processing ? 'Sedang Masuk...' : 'Masuk Sekarang'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <div className="mt-8 text-white text-sm opacity-80">
                &copy; 2026 {schoolName} - Sistem Pendukung Keputusan
            </div>
        </div>
    );
}