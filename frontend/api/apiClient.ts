// API client for making requests to the backend

import axios from 'axios';
import logger from '@frontend/utils/logger';
import { buildApiUrl } from './buildApiUrl';

// Create a custom axios instance
const apiClient = axios.create({
  baseURL: '', // Using relative URLs to make requests go through nginx
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
    
    if (config.url) {
      const fullUrl = buildApiUrl('', config.url);
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