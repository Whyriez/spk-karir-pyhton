import {useState, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import apiClient from '@/lib/axios';
import {LayoutContext, type User} from './LayoutContext';

export function LayoutProvider({children}: { children: ReactNode }) {

    const [schoolName, setSchoolName] = useState('SMK Negeri 1 Gorontalo');
    const [appLogo, setAppLogo] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const [user, setUser] = useState<User | null>(() => {
        const userString = localStorage.getItem('user');
        return userString ? JSON.parse(userString) : null;
    });

    const apiBaseUrl = import.meta.env.VITE_API_URL || '';

    const refreshUser = useCallback(() => {
        const userString = localStorage.getItem('user');
        setUser(userString ? JSON.parse(userString) : null);
    }, []);

    const refreshSettings = useCallback(() => {

        apiClient.get('/settings')
            .then(res => {

                if (res.data.nama_sekolah)
                    setSchoolName(res.data.nama_sekolah);

                if (res.data.school_logo)
                    setAppLogo(`${apiBaseUrl}/${res.data.school_logo}`);
                else
                    setAppLogo(null);

            })
            .finally(() => setIsLoaded(true));

    }, []);

    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    return (
        <LayoutContext.Provider value={{
            schoolName,
            appLogo,
            user,
            isLoaded,
            refreshUser,
            refreshSettings
        }}>
            {children}
        </LayoutContext.Provider>
    );
}