import { useState, useMemo, memo, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import ApplicationLogo from '@/components/ApplicationLogo';
import Dropdown from '@/components/Dropdown';
import NavLink from '@/components/NavLink';
import ResponsiveNavLink from "../components/ResponsiveNavLink.tsx";
import { useLayout } from '@/contexts/useLayout.ts';

type MenuItem = {
    label: string;
    to: string;
};

type Menu =
    | {
        label: string;
        type: 'link';
        to: string;
    }
    | {
        label: string;
        type: 'dropdown';
        items: {
            label: string;
            to: string;
        }[];
    };

interface NavbarProps {
    user: {
        name: string;
        role: string;
        jenis_pakar?: string;
    };
    schoolName: string;
    menus: Menu[];
    routeIsActive: (path: string) => boolean;
    onLogout: () => void;
    showingDropdown: boolean;
    setShowingDropdown: React.Dispatch<React.SetStateAction<boolean>>;
}

// Memoize Navbar agar tidak re-render kecuali props berubah
const Navbar = memo(function Navbar({
    user,
    schoolName,
    menus,
    routeIsActive,
    onLogout,
    showingDropdown,
    setShowingDropdown
}: NavbarProps) {
    const location = useLocation();

    // Close mobile dropdown saat route berubah
    useEffect(() => {
        setShowingDropdown(false);
    }, [location.pathname, setShowingDropdown]);

    return (
        <nav className="border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between items-center">
                    
                    {/* BAGIAN KIRI: LOGO & NAMA SEKOLAH */}
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
                            <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800" />
                            {/* [PERBAIKAN] Class 'hidden sm:block' DIHAPUS agar nama sekolah selalu tampil */}
                            <span className="font-bold text-lg text-gray-700 hover:text-indigo-600 transition truncate max-w-[200px] sm:max-w-none">
                                {schoolName}
                            </span>
                        </Link>

                        {/* MENU UTAMA DESKTOP */}
                        <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                            {menus.map((menu: Menu, index: number) => {
                                if (menu.type === 'dropdown') {
                                    return (
                                        <div key={`menu-${index}`} className="hidden sm:flex sm:items-center">
                                            <Dropdown>
                                                <Dropdown.Trigger>
                                                    <span className="inline-flex rounded-md">
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none">
                                                            {menu.label}
                                                            <svg className="-mr-0.5 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                </Dropdown.Trigger>
                                                <Dropdown.Content>
                                                    {menu.items.map((subItem: MenuItem, subIdx: number) => (
                                                        <Dropdown.Link key={`submenu-${index}-${subIdx}`} to={subItem.to}>
                                                            {subItem.label}
                                                        </Dropdown.Link>
                                                    ))}
                                                </Dropdown.Content>
                                            </Dropdown>
                                        </div>
                                    );
                                }
                                return (
                                    <NavLink key={`navlink-${index}`} to={menu.to} active={routeIsActive(menu.to)}>
                                        {menu.label}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>

                    {/* BAGIAN KANAN DESKTOP: PROFIL & LOGOUT */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <div className="relative ml-3">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button"
                                            className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none">
                                            {user.name} ({user.role})
                                            <svg className="-mr-0.5 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150 ease-in-out">
                                        Profil Saya
                                    </Link>
                                    <button onClick={onLogout}
                                        className="block w-full px-4 py-2 text-left text-sm leading-5 text-red-600 font-medium hover:bg-red-50 focus:outline-none focus:bg-red-100 transition duration-150 ease-in-out">
                                        Log Out
                                    </button>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>

                    {/* HAMBURGER MENU (MOBILE) */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button onClick={() => setShowingDropdown((prev: boolean) => !prev)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none transition duration-150 ease-in-out">
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path className={!showingDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                <path className={showingDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MOBILE DROPDOWN MENU --- */}
            <div className={(showingDropdown ? 'block' : 'hidden') + ' sm:hidden border-t border-gray-100 bg-white shadow-lg absolute w-full'}>
                {/* 1. Menu Navigasi Utama */}
                <div className="space-y-1 pb-3 pt-2">
                    {menus.map((menu: Menu, index: number) => {
                        if (menu.type === 'dropdown') {
                            return (
                                <div key={`mobile-menu-${index}`}>
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">{menu.label}</div>
                                    {menu.items.map((sub: MenuItem, subIdx: number) => (
                                        <ResponsiveNavLink key={`mobile-submenu-${index}-${subIdx}`} to={sub.to} active={routeIsActive(sub.to)}>
                                            <span className="pl-4 border-l-2 border-transparent">&rarr; {sub.label}</span>
                                        </ResponsiveNavLink>
                                    ))}
                                </div>
                            )
                        }
                        return (
                            <ResponsiveNavLink key={`mobile-navlink-${index}`} to={menu.to} active={routeIsActive(menu.to)}>
                                {menu.label}
                            </ResponsiveNavLink>
                        )
                    })}
                </div>

                {/* 2. Menu Profil & Logout (HANYA MUNCUL DI MOBILE) */}
                <div className="border-t border-gray-200 pb-4 pt-4">
                    <div className="px-4 mb-3">
                        <div className="text-base font-bold text-gray-800">{user.name}</div>
                        <div className="text-sm font-medium text-gray-500 uppercase">{user.role}</div>
                    </div>
                    <div className="space-y-1 mt-3">
                        <ResponsiveNavLink to="/profile" active={routeIsActive('/profile')}>
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profil Saya
                            </span>
                        </ResponsiveNavLink>
                        <button
                            onClick={onLogout}
                            className="flex w-full items-start py-2 pl-3 pr-4 text-base font-medium text-red-600 transition duration-150 ease-in-out hover:bg-red-50 hover:text-red-800 focus:bg-red-50 focus:text-red-800 focus:outline-none"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Log Out
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
});

export default function AuthenticatedLayout() {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const location = useLocation();

    const { schoolName, user } = useLayout();

    // Generate menus ONCE
    const menus = useMemo<Menu[]>(() => {
        if (!user) return [];

        switch (user.role) {
            case "admin":
                return [
                    { label: "Dashboard", to: "/dashboard", type: "link" },
                    {
                        label: "Lainnya",
                        type: "dropdown",
                        items: [
                            { label: "Monitoring Siswa", to: "/admin/monitoring" },
                            { label: "Lab Simulasi", to: "/admin/simulation", type: "link" },
                        ]
                    },
                    {
                        label: "Manajemen User", // Boleh digabung atau dipisah
                        type: "dropdown",
                        items: [
                            { label: "Data Siswa", to: "/admin/siswa" },
                            { label: "Data Alumni", to: "/admin/alumni" },
                            { label: "Data Pakar (Guru/Kaprodi)", to: "/admin/pakar" },
                            { label: "Data Admin", to: "/admin/users" },
                        ]
                    },
                    {
                        label: "Master Data",
                        type: "dropdown",
                        items: [
                            { label: "Data Jurusan", to: "/admin/jurusan" },
                            { label: "Data Kriteria", to: "/admin/kriteria" },
                            { label: "Periode Aktif", to: "/admin/periode" },
                            { label: "Pengaturan BWM", to: "/admin/bwm/setting" },
                        ]
                    },
                    { label: "Pengaturan", to: "/admin/settings", type: "link" },
                ];
            case "pakar": {
                const pakarMenus: Menu[] = [
                    { label: "Dashboard", to: "/dashboard", type: "link" },
                    { label: "Monitoring Siswa", to: "/pakar/monitoring", type: "link" },
                    { label: "Manajemen Pertanyaan", to: "/pakar/kriteria", type: "link" },
                    { label: "Input Bobot (BWM)", to: "/pakar/bwm", type: "link" },
                ];

                if (user.jenis_pakar === 'kaprodi') {
                    pakarMenus.push({
                        label: "Data Jurusan",
                        to: "/pakar/jurusan",
                        type: "link"
                    });
                }

                return pakarMenus;
            }
            case "siswa":
                return [
                    { label: "Dashboard", to: "/dashboard", type: "link" },
                    { label: "Isi Penilaian", to: "/siswa/input", type: "link" },
                    { label: "Hasil Rekomendasi", to: "/siswa/result", type: "link" },
                ];
            default:
                return [];
        }
    }, [user]);

    const handleLogout = useMemo(() => () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.location.href = '/login';
    }, []);

    const routeIsActive = useMemo(() => (path: string) => location.pathname.startsWith(path), [location.pathname]);

    // Jika user null, skip rendering (akan redirect di ProtectedRoute)
    if (!user) {
        return <Outlet />;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar
                user={user}
                schoolName={schoolName}
                menus={menus}
                routeIsActive={routeIsActive}
                onLogout={handleLogout}
                showingDropdown={showingNavigationDropdown}
                setShowingDropdown={setShowingNavigationDropdown}
            />
            <main>
                <Outlet />
            </main>
        </div>
    );
}