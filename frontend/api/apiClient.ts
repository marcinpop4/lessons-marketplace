// API client for making requests to the backend
import axios, {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    AxiosRequestConfig
} from 'axios';
import { buildApiUrl } from './buildApiUrl';

// Define a more specific type for error response data
interface ErrorResponseData {
    error?: string;
    message?: string;
    [key: string]: any; // Allow other properties
}

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
    async (error: AxiosError<ErrorResponseData>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log API errors (keeping this for debugging)
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.message} for URL: ${error.config?.url}`, error.response.data);
        } else {
            console.error(`API Error: ${error.message} for URL: ${error.config?.url}`);
        }

        // Skip token refresh for login endpoint and if we've already retried
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            originalRequest.url && !originalRequest.url.endsWith('/auth/login') && !originalRequest.url.endsWith('/auth/refresh-token')) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await axios.post<{ accessToken: string }>(
                    buildApiUrl('', '/api/v1/auth/refresh-token'),
                    {},
                    { withCredentials: true }
                );
                if (refreshResponse.data.accessToken) {
                    localStorage.setItem('auth_token', refreshResponse.data.accessToken);
                    // Update the default authorization header for subsequent requests
                    if (apiClient.defaults.headers.common) {
                        apiClient.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;
                    }
                    // Update the header for the original request being retried
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
                    }
                    return apiClient(originalRequest);
                }
            } catch (refreshError: any) {
                console.error('Token refresh failed:', refreshError);
                // If refresh token itself fails with 401, or any other error, clear token and redirect
                localStorage.removeItem('auth_token');
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
                    // window.location.href = '/auth'; // Avoid immediate redirect from apiClient
                    // Instead, throw a specific error or let the original 401 propagate 
                    // so UI can decide to redirect or show login prompt.
                    // For now, we'll let the original error propagate after a failed refresh.
                }
                // Propagate a new error or the refreshError, ensuring it has a user-friendly message if possible
                const specificMessage = (refreshError.response?.data as ErrorResponseData)?.error ||
                    (refreshError.response?.data as ErrorResponseData)?.message ||
                    refreshError.message;
                return Promise.reject(new Error(specificMessage || 'Session refresh failed. Please log in again.'));
            }
        }

        // For non-401 errors or if retry is not applicable, create a more specific error message.
        if (error.response) {
            const responseData = error.response.data; // Already typed as ErrorResponseData | undefined
            const message = responseData?.error || responseData?.message || `Request failed with status code ${error.response.status}`;
            const customError = new Error(message);
            (customError as any).status = error.response.status;
            (customError as any).response = error.response; // Keep original response for more details if needed
            return Promise.reject(customError);
        } else if (error.request) {
            // The request was made but no response was received
            return Promise.reject(new Error('No response received from server. Please check your network connection.'));
        }
        // Something happened in setting up the request that triggered an Error
        return Promise.reject(new Error(error.message || 'An unexpected error occurred.'));
    }
);
export default apiClient;
