import {useState, useMemo, memo, useEffect} from 'react';
import {Link, useLocation, Outlet} from 'react-router-dom';
import ApplicationLogo from '@/components/ApplicationLogo';
import Dropdown from '@/components/Dropdown';
import NavLink from '@/components/NavLink';
import ResponsiveNavLink from "../components/ResponsiveNavLink.tsx";
import {useLayout} from '@/contexts/LayoutContext';

// Memoize Navbar agar tidak re-render kecuali props berubah
const Navbar = memo(function Navbar({
                                        user,
                                        schoolName,
                                        menus,
                                        routeIsActive,
                                        onLogout,
                                        showingDropdown,
                                        setShowingDropdown
                                    }: any) {
    const location = useLocation();

    // Close mobile dropdown saat route berubah
    useEffect(() => {
        setShowingDropdown(false);
    }, [location.pathname, setShowingDropdown]);
    return (
        <nav className="border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex shrink-0 items-center gap-3">
                            <Link to="/dashboard">
                                <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800"/>
                            </Link>
                            <Link to="/dashboard"
                                  className="hidden font-bold text-lg text-gray-700 sm:block hover:text-indigo-600 transition">
                                {schoolName}
                            </Link>
                        </div>
                        <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                            {menus.map((menu: any, index: number) => {
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
                                                            <svg className="-mr-0.5 ml-2 h-4 w-4"
                                                                 xmlns="http://www.w3.org/2000/svg"
                                                                 viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd"
                                                                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                                      clipRule="evenodd"/>
                                                            </svg>
                                                        </button>
                                                    </span>
                                                </Dropdown.Trigger>
                                                <Dropdown.Content>
                                                    {menu.items.map((subItem: any, subIdx: number) => (
                                                        <Dropdown.Link key={`submenu-${index}-${subIdx}`}
                                                                       to={subItem.to}>
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
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <div className="relative ml-3">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none">
                                            {user.name} ({user.role})
                                            <svg className="-mr-0.5 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                                 viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd"
                                                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <button onClick={onLogout}
                                            className="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out">
                                        Log Out
                                    </button>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button onClick={() => setShowingDropdown((prev: boolean) => !prev)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none">
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path className={!showingDropdown ? 'inline-flex' : 'hidden'}
                                      strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M4 6h16M4 12h16M4 18h16"/>
                                <path className={showingDropdown ? 'inline-flex' : 'hidden'}
                                      strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={(showingDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                <div className="space-y-1 pb-3 pt-2">
                    {menus.map((menu: any, index: number) => {
                        if (menu.type === 'dropdown') {
                            return (
                                <div key={`mobile-menu-${index}`}>
                                    <div
                                        className="px-4 py-2 text-xs font-bold text-gray-400 uppercase">{menu.label}</div>
                                    {menu.items.map((sub: any, subIdx: number) => (
                                        <ResponsiveNavLink key={`mobile-submenu-${index}-${subIdx}`} to={sub.to}
                                                           active={routeIsActive(sub.to)}>
                                            &rarr; {sub.label}
                                        </ResponsiveNavLink>
                                    ))}
                                </div>
                            )
                        }
                        return (
                            <ResponsiveNavLink key={`mobile-navlink-${index}`} to={menu.to}
                                               active={routeIsActive(menu.to)}>
                                {menu.label}
                            </ResponsiveNavLink>
                        )
                    })}
                </div>
            </div>
        </nav>
    );
});

export default function AuthenticatedLayout() {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const location = useLocation();

    const {schoolName, user} = useLayout();

    // Generate menus ONCE
    const menus = useMemo(() => {
        if (!user) return [];

        switch (user.role) {
            case "admin":
                return [
                    {label: "Dashboard", to: "/dashboard", type: "link"},
                    {
                        label: "Lainnya",
                        type: "dropdown",
                        items: [
                            {label: "Monitoring Siswa", to: "/admin/monitoring"},
                            { label: "Lab Simulasi", to: "/admin/simulation", type: "link" },
                        ]
                    },
                    {
                        label: "Manajemen User", // Boleh digabung atau dipisah
                        type: "dropdown",
                        items: [
                            {label: "Data Siswa", to: "/admin/siswa"},
                            {label: "Data Alumni", to: "/admin/alumni"},
                            {label: "Data Pakar (Guru/Kaprodi)", to: "/admin/pakar"},
                        ]
                    },
                    {
                        label: "Master Data",
                        type: "dropdown",
                        items: [
                            {label: "Data Jurusan", to: "/admin/jurusan"},
                            {label: "Data Kriteria", to: "/admin/kriteria"},
                            {label: "Periode Aktif", to: "/admin/periode"},
                            {label: "Pengaturan BWM", to: "/admin/bwm/setting"},
                        ]
                    },
                    {label: "Pengaturan", to: "/admin/settings", type: "link"},
                ];
            case "pakar":
                const pakarMenus = [
                    {label: "Dashboard", to: "/dashboard", type: "link"},
                    {label: "Manajemen Pertanyaan", to: "/pakar/kriteria", type: "link"},
                    {label: "Input Bobot (BWM)", to: "/pakar/bwm", type: "link"},
                ];
                if (user.jenis_pakar === 'kaprodi') {
                    pakarMenus.push({label: "Data Jurusan", to: "/pakar/jurusan", type: "link"});
                }

                return pakarMenus;
            case "siswa":
                return [
                    {label: "Dashboard", to: "/dashboard", type: "link"},
                    {label: "Isi Penilaian", to: "/siswa/input", type: "link"},
                    {label: "Hasil Rekomendasi", to: "/siswa/result", type: "link"},
                ];
            default:
                return [];
        }
    }, [user]);

    const handleLogout = useMemo(() => () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.location.href = '/login';
    }, []);

    const routeIsActive = useMemo(() => (path: string) => location.pathname.startsWith(path), [location.pathname]);

    // Jika user null, skip rendering (akan redirect di ProtectedRoute)
    if (!user) {
        return <Outlet/>;
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
                <Outlet/>
            </main>
        </div>
    );
}