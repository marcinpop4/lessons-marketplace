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

// Base API URL determination
const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_MODE === 'true';

// For tests and development, always use the local API
// In production, use runtime config or env variable
let API_BASE_URL = '/api';  // Default to local relative path for dev and test

// Only use external URLs in production
if (!isDevelopment && !isTest) {
  API_BASE_URL = window.API_CONFIG?.BASE_URL || `${import.meta.env.VITE_API_BASE_URL}/api`;
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