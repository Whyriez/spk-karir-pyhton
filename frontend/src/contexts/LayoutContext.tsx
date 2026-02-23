import {createContext} from 'react';

export interface User {
    name: string;
    role: string;
    email?: string;
    jenis_pakar: string;
}

export interface LayoutContextType {
    schoolName: string;
    appLogo: string | null;
    user: User | null;
    isLoaded: boolean;
    refreshUser: () => void;
    refreshSettings: () => void;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);