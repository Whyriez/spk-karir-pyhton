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

// --- REQUEST INTERCEPTOR ---
apiClient.interceptors.request.use((config) => {
    NProgress.start();
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    NProgress.done();
    return Promise.reject(error);
});

// --- LOGIKA REFRESH TOKEN QUEUE ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// --- RESPONSE INTERCEPTOR ---
apiClient.interceptors.response.use(
    (response) => {
        NProgress.done();
        return response;
    },
    async (error) => {
        NProgress.done();
        const originalRequest = error.config;

        // Jika error 401 (Unauthorized) dan BUKAN dari halaman login
        if (error.response?.status === 401 && !originalRequest._retry && window.location.pathname !== '/login') {
            
            // Jika sedang merefresh, masukkan request ke antrean (queue)
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return apiClient(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');
            
            // Jika tidak ada refresh token, terpaksa harus login ulang
            if (!refreshToken) {
                isRefreshing = false;
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Tembak API Refresh menggunakan axios biasa (bukan apiClient agar tidak memicu interceptor loop)
                const { data } = await axios.post('/api/auth/refresh', {}, {
                    headers: {
                        Authorization: `Bearer ${refreshToken}`
                    }
                });

                // Simpan token baru
                localStorage.setItem('token', data.token);
                
                // Update header untuk axios instance dan request asli yang gagal
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;

                // Jalankan ulang antrean request
                processQueue(null, data.token);

                // Jalankan ulang request yang memicu 401
                return apiClient(originalRequest);
                
            } catch (err) {
                // Refresh token mati/expired -> Bersihkan storage dan lempar ke Login
                processQueue(err, null);
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;