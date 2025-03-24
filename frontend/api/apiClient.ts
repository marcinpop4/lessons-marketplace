// API client for making requests to the backend

import axios from 'axios';
import logger from '@frontend/utils/logger';
import { buildApiUrl } from './buildApiUrl';

/**
 * Determine the appropriate API base URL based on the environment
 * @returns The API base URL to use
 */
export function getApiBaseUrl(): string {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isTest = import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_MODE === 'true';
  
  // Debug logging for environment detection
  console.log('[API DEBUG] Environment MODE:', import.meta.env.MODE);
  console.log('[API DEBUG] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('[API DEBUG] Is development?', isDevelopment);
  console.log('[API DEBUG] Is test?', isTest);
  
  // In development or test, always use the relative path which gets proxied by Vite
  if (isDevelopment || isTest) {
    console.log('[API DEBUG] Using development/test API URL: /api');
    return '/api';
  }
  
  // In production, the environment variable MUST be defined
  if (!import.meta.env.VITE_API_BASE_URL) {
    const errorMsg = 'VITE_API_BASE_URL environment variable is required in production';
    console.error('[API DEBUG] ' + errorMsg);
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  console.log('[API DEBUG] Using API URL from environment variable:', baseUrl);
  logger.info('Using API URL from environment variable:', baseUrl);
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

// Log the base URL being used
console.log('[API DEBUG] API_BASE_URL used for axios instance:', API_BASE_URL);
logger.debug('API base URL:', API_BASE_URL);

// Add request interceptor to inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for request URLs
    console.log('[API DEBUG] Request URL (path):', config.url);
    console.log('[API DEBUG] Base URL for request:', config.baseURL);
    console.log('[API DEBUG] Method:', config.method);
    console.log('[API DEBUG] Full URL being requested:', 
        config.baseURL + (config.url?.startsWith('/') ? config.url : '/' + config.url));
    
    // In production, log the URL of each request for debugging
    const isDevelopment = import.meta.env.MODE === 'development';
    const isTest = import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_MODE === 'true';
    
    if (!isDevelopment && !isTest && config.url) {
      const fullUrl = buildApiUrl(API_BASE_URL, config.url);
      console.log('[API DEBUG] Built URL using buildApiUrl:', fullUrl);
      logger.info('Making API request to:', fullUrl);
    }
    
    return config;
  },
  (error) => {
    console.error('[API DEBUG] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refreshing
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log API errors
    if (error.response) {
      console.error('[API DEBUG] Error response:', error.response.status, error.message, error.config?.url);
      logger.error(`API Error: ${error.response.status} - ${error.message}`, error.config?.url);
    } else {
      console.error('[API DEBUG] Error with no response:', error.message);
      logger.error(`API Error: ${error.message}`);
    }
    
    const originalRequest = error.config;
    
    // Skip token refresh for login endpoint and if we've already retried
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.endsWith('/auth/login')) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token - caller must include version in their path
        const refreshUrl = buildApiUrl(API_BASE_URL, '/v1/auth/refresh-token');
        console.log('[API DEBUG] Attempting token refresh at URL:', refreshUrl);
        
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
          console.log('[API DEBUG] Token refresh successful, retrying original request');
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API DEBUG] Token refresh failed:', refreshError);
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