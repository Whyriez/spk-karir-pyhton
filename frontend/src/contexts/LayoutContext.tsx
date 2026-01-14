import {createContext, useContext, useState, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import apiClient from '@/lib/axios';

interface User {
    name: string;
    role: string;
    email?: string;
    jenis_pakar: string;
}

interface LayoutContextType {
    schoolName: string;
    user: User | null;
    isLoaded: boolean;
    refreshUser: () => void;
    refreshSettings: () => void; // <--- FUNGSI BARU
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({children}: { children: ReactNode }) {
    const [schoolName, setSchoolName] = useState('SMK Negeri 1 Gorontalo');
    const [isLoaded, setIsLoaded] = useState(false);
    const [user, setUser] = useState<User | null>(() => {
        const userString = localStorage.getItem('user');
        return userString ? JSON.parse(userString) : null;
    });

    // Kita hapus hasFetched ref agar fetchSettings bisa dipanggil ulang kapan saja
    // const hasFetched = useRef(false);

    // Method untuk refresh user dari localStorage
    const refreshUser = useCallback(() => {
        const userString = localStorage.getItem('user');
        const newUser = userString ? JSON.parse(userString) : null;
        setUser(newUser);
    }, []);

    // Method untuk fetch settings (Dipisahkan agar bisa dipanggil ulang)
    const refreshSettings = useCallback(() => {
        apiClient.get('/settings')
            .then(res => {
                if (res.data.nama_sekolah) {
                    setSchoolName(res.data.nama_sekolah);
                    console.log('✅ School name updated:', res.data.nama_sekolah);
                }
            })
            .catch(err => console.error("❌ Gagal memuat pengaturan sekolah", err))
            .finally(() => {
                setIsLoaded(true);
            });
    }, []);

    // Fetch settings saat pertama kali mount
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    return (
        <LayoutContext.Provider value={{schoolName, user, isLoaded, refreshUser, refreshSettings}}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}