// API client for making requests to the backend

import axios from 'axios';

// Check if we have a runtime configuration (set in the Docker environment)
declare global {
  interface Window {
    API_CONFIG?: {
      BASE_URL: string;
    };
  }
}

// Base API URL - in development we use the Vite proxy, in production we require VITE_API_BASE_URL
const isDevelopment = import.meta.env.MODE === 'development';
// Use runtime config if available, otherwise fall back to environment variables
const API_BASE_URL = window.API_CONFIG?.BASE_URL || (isDevelopment 
  ? '/api' // Use relative path for development (will be proxied by Vite)
  : `${import.meta.env.VITE_API_BASE_URL}/api`); // Append /api to the base URL

if (!isDevelopment && !API_BASE_URL) {
  throw new Error('API base URL is required in production');
}

console.log('API client initialized with base URL:', API_BASE_URL);

// Create a custom axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Allow cookies
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refreshing
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
        const response = await axios.post(
          `${baseUrl}/api/auth/refresh-token`, 
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
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 