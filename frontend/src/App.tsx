import type {JSX} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom';
import {LayoutProvider} from '@/contexts/LayoutContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Admin Pages
import KriteriaIndex from "./pages/admin/kriteria";
import PeriodeIndex from "./pages/admin/periode";
import JurusanIndex from "./pages/admin/jurusan";
import AlumniIndex from "./pages/admin/alumni";
import MonitoringIndex from "./pages/admin/monitoring";
import Settings from "./pages/admin/Settings";
import AdminSiswaIndex from "./pages/admin/siswa";

// Pakar Pages
import BwmInput from './pages/pakar/bwm/input';
import KriteriaPakar from './pages/pakar/kriteria/input';
import JurusanPakarIndex from "./pages/pakar/jurusan";

// Siswa Pages
import InputDataSiswa from "./pages/siswa/InputData";
import ResultSiswa from "./pages/siswa/Result";
import BwmSetting from "./pages/admin/bwm/Setting.tsx";
import Welcome from "./pages/Welcome.tsx";
import AuthenticatedLayout from "./Layouts/AuthenticatedLayout.tsx";
import PakarIndex from "./pages/admin/pakar";
import SimulationIndex from "./pages/admin/simulation";



// Protected Route Component
const ProtectedRoute = ({children, roles}: { children: JSX.Element, roles?: string[] }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace/>;
    }

    if (roles && userRole && !roles.includes(userRole)) {
        return <Navigate to="/dashboard" replace/>;
    }

    return children;
};

function App() {
    return (
        <Router>
            {/* SINGLE LayoutProvider untuk SEMUA routes */}
            <LayoutProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Welcome />} />
                    <Route path="/login" element={<Login />} />

                    {/* Authenticated routes with Layout */}
                    <Route element={<AuthenticatedLayout />}>
                        {/* Dashboard */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />

                        <Route path="/admin/simulation" element={<SimulationIndex />} />

                        {/* ADMIN ROUTES */}
                        <Route path="/admin/kriteria" element={<ProtectedRoute roles={['admin']}><KriteriaIndex /></ProtectedRoute>} />
                        <Route path="/admin/periode" element={<ProtectedRoute roles={['admin']}><PeriodeIndex /></ProtectedRoute>} />
                        <Route path="/admin/jurusan" element={<ProtectedRoute roles={['admin']}><JurusanIndex /></ProtectedRoute>} />
                        <Route path="/admin/alumni" element={<ProtectedRoute roles={['admin']}><AlumniIndex /></ProtectedRoute>} />
                        <Route path="/admin/monitoring" element={<ProtectedRoute roles={['admin']}><MonitoringIndex /></ProtectedRoute>} />
                        <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
                        <Route path="/admin/bwm/setting" element={<ProtectedRoute roles={['admin']}><BwmSetting /></ProtectedRoute>} />
                        <Route path="/admin/siswa" element={<ProtectedRoute roles={['admin']}><AdminSiswaIndex /></ProtectedRoute>} />
                        <Route path="/admin/pakar" element={<ProtectedRoute roles={['admin']}><PakarIndex /></ProtectedRoute>} />

                        {/* PAKAR ROUTES */}
                        <Route path="/pakar/bwm" element={<ProtectedRoute roles={['pakar']}><BwmInput /></ProtectedRoute>} />
                        <Route path="/pakar/kriteria" element={<ProtectedRoute roles={['pakar']}><KriteriaPakar /></ProtectedRoute>} />
                        <Route path="/pakar/jurusan" element={<ProtectedRoute roles={['pakar']}><JurusanPakarIndex /></ProtectedRoute>} />

                        {/* SISWA ROUTES */}
                        <Route path="/siswa/input" element={<ProtectedRoute roles={['siswa']}><InputDataSiswa /></ProtectedRoute>} />
                        <Route path="/siswa/result" element={<ProtectedRoute roles={['siswa']}><ResultSiswa /></ProtectedRoute>} />
                    </Route>

                    <Route path="*" element={<div className="p-10 text-center">404 | Not Found</div>}/>
                </Routes>
            </LayoutProvider>
        </Router>
    );
}

export default App;