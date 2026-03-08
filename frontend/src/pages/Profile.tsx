import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import InputLabel from '@/components/InputLabel';
import TextInput from '@/components/TextInput';
import PrimaryButton from '@/components/PrimaryButton';
import apiClient from '@/lib/axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function Profile() {
    const [user, setUser] = useState<any>(null);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        // Ambil data user yang sedang login dari localStorage
        const userString = localStorage.getItem('user');
        if (userString) {
            setUser(JSON.parse(userString));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Password baru dan konfirmasi tidak cocok.' });
            return;
        }
        if (newPassword.length < 6) {
            MySwal.fire({ icon: 'error', title: 'Gagal', text: 'Password baru minimal 6 karakter.' });
            return;
        }

        setProcessing(true);
        try {
            const res = await apiClient.put('/auth/change-password', {
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            
            MySwal.fire({ icon: 'success', title: 'Berhasil', text: res.data.msg });
            
            // Kosongkan form setelah berhasil
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const msg = error.response?.data?.msg || 'Gagal mengubah password.';
            MySwal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setProcessing(false);
        }
    };

    if (!user) return null;

    return (
        <div>
            <Header>
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Pengaturan Profil</h2>
            </Header>

            <div className="py-8 px-4 sm:px-8">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* --- KARTU INFORMASI AKUN (READ ONLY) --- */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Informasi Akun</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <InputLabel value="Nama Lengkap" />
                                <TextInput value={user.name} disabled className="w-full mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <InputLabel value="Username / ID Login" />
                                <TextInput value={user.username || '-'} disabled className="w-full mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <InputLabel value="Hak Akses (Role)" />
                                <TextInput value={user.role.toUpperCase()} disabled className="w-full mt-1 bg-gray-50 text-gray-500 font-bold cursor-not-allowed" />
                            </div>
                            
                            {/* Munculkan jika Pakar / Siswa punya jurusan */}
                            {user.jurusan_id && (
                                <div>
                                    <InputLabel value={user.role === 'siswa' ? "Jurusan" : "Penanggung Jawab Jurusan"} />
                                    <TextInput value={user.jurusan?.nama_jurusan || "Data Jurusan Tersimpan"} disabled className="w-full mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- FORM UBAH PASSWORD --- */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Ubah Password Keamanan</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <InputLabel value="Password Lama" required />
                                <TextInput
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full mt-1"
                                    placeholder="Masukkan password saat ini"
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Password Baru" required />
                                <TextInput
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full mt-1"
                                    placeholder="Buat password baru"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter.</p>
                            </div>
                            <div>
                                <InputLabel value="Konfirmasi Password Baru" required />
                                <TextInput
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full mt-1"
                                    placeholder="Ketik ulang password baru"
                                    required
                                />
                            </div>
                            
                            <div className="flex justify-end pt-4">
                                <PrimaryButton disabled={processing || !oldPassword || !newPassword || !confirmPassword}>
                                    {processing ? 'Menyimpan...' : 'Simpan Password Baru'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}