// API client for making requests to the backend

import axios from 'axios';
import logger from '../utils/logger.js';

// Type declaration for the global window object with API_CONFIG
declare global {
  interface Window {
    API_CONFIG?: {
      BASE_URL: string;
    };
  }
}

// In development/test, always use the local API that gets proxied by Vite
// In production, use the runtime configuration from config.js
const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_MODE === 'true';

// Use a different API URL based on the environment
let API_BASE_URL: string;

if (isDevelopment || isTest) {
  // In development or test, always use the relative path which gets proxied by Vite
  API_BASE_URL = '/api';
} else {
  // In production, the API URL must be set in the config.js file
  if (!window.API_CONFIG?.BASE_URL) {
    throw new Error('API_CONFIG.BASE_URL is required in production. Make sure config.js is properly loaded.');
  }
  API_BASE_URL = window.API_CONFIG.BASE_URL;
}

// API version prefix
const API_VERSION = '/v1';

// Full API base URL with version
const VERSIONED_API_BASE_URL = `${API_BASE_URL}${API_VERSION}`;

// Log API URL at debug level
logger.debug('API URL:', VERSIONED_API_BASE_URL);

// Create a custom axios instance
const apiClient = axios.create({
  baseURL: VERSIONED_API_BASE_URL,
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
    
    // Skip token refresh for login endpoint and if we've already retried
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.endsWith('/auth/login')) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token - update to use versioned URL
        const refreshUrl = `${API_BASE_URL}${API_VERSION}/auth/refresh-token`;
        
        const response = await axios.post(
          refreshUrl, 
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
        logger.error('Token refresh failed:', refreshError);
        // If refresh fails, redirect to login only if not already on login page
        if (!window.location.pathname.includes('/auth')) {
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