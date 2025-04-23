// API client for making requests to the backend
import axios, {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    AxiosRequestConfig
} from 'axios';
import { buildApiUrl } from './buildApiUrl';
// Create a custom axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: '', // Using relative URLs to make requests go through nginx
    withCredentials: true, // Allow cookies
    timeout: 10000, // Revert to 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    }
});
// Add request interceptor to inject auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.url) {
        const fullUrl = buildApiUrl('', config.url);
        console.debug('Making API request to:', fullUrl);
    }
    return config;
}, (error: AxiosError) => {
    return Promise.reject(error);
});
// Add response interceptor to handle token refreshing
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        // Log API errors
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.message}`, error.config?.url);
        }
        else {
            console.error(`API Error: ${error.message}`);
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip token refresh for login endpoint and if we've already retried
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.endsWith('/auth/login')) {

            originalRequest._retry = true;
            try {
                // Try to refresh the token
                const response = await axios.post(
                    buildApiUrl('', '/api/v1/auth/refresh-token'),
                    {},
                    { withCredentials: true }
                );

                // If we get a new token, update it and retry
                if (response.data.accessToken) {
                    localStorage.setItem('auth_token', response.data.accessToken);
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
                    return apiClient(originalRequest);
                }
            }
            catch (refreshError) {
                console.error('Token refresh failed:', refreshError);

                // If refresh fails, redirect to login only if not already on login page
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/auth';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
export default apiClient;
