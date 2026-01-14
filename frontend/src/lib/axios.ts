import axios from 'axios';
import NProgress from 'nprogress';

// Konfigurasi NProgress
NProgress.configure({ showSpinner: false });

const apiClient = axios.create({
    baseURL: '/api', // Pastikan sesuai dengan proxy Vite Anda
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// --- REQUEST INTERCEPTOR (PENTING) ---
apiClient.interceptors.request.use((config) => {
    // 1. Jalankan Loading Bar
    NProgress.start();

    // 2. Ambil Token dari LocalStorage
    const token = localStorage.getItem('token');

    // 3. Jika token ada, tempelkan ke Header 'Authorization'
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    NProgress.done();
    return Promise.reject(error);
});

// --- RESPONSE INTERCEPTOR ---
apiClient.interceptors.response.use(
    (response) => {
        NProgress.done();
        return response;
    },
    (error) => {
        NProgress.done();

        // Opsional: Jika token expired (401), otomatis logout
        if (error.response && error.response.status === 401) {
            // Cek agar tidak looping redirect di halaman login itu sendiri
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;