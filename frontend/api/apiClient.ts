// API client for making requests to the backend

import axios from 'axios';
import logger from '@frontend/utils/logger';
import { buildApiUrl } from './buildApiUrl';

/**
 * Get the API base URL from environment variables
 * @returns The API base URL to use
 */
export function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    const errorMsg = 'VITE_API_BASE_URL environment variable is required';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  logger.debug('Using API URL:', baseUrl);
  return baseUrl;
}

/**
 * Build a complete API URL using the base URL and path
 * @param basePath - The base path for the API
 * @param path - The specific path/endpoint to access
 * @returns The complete URL
 */
export { buildApiUrl };

// Get the base URL for API requests
const API_BASE_URL = getApiBaseUrl();

// Create a custom axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Allow cookies
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

logger.debug('API base URL:', API_BASE_URL);

// Add request interceptor to inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.url) {
      const fullUrl = buildApiUrl(API_BASE_URL, config.url);
      logger.debug('Making API request to:', fullUrl);
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
    // Log API errors
    if (error.response) {
      logger.error(`API Error: ${error.response.status} - ${error.message}`, error.config?.url);
    } else {
      logger.error(`API Error: ${error.message}`);
    }
    
    const originalRequest = error.config;
    
    // Skip token refresh for login endpoint and if we've already retried
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.endsWith('/auth/login')) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const response = await axios.post(
          buildApiUrl(API_BASE_URL, '/v1/auth/refresh-token'), 
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