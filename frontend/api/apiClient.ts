// API client for making requests to the backend

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// Request method types
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Generic request options
interface RequestOptions<T = unknown> {
  method: Method;
  headers?: Record<string, string>;
  body?: T;
  params?: Record<string, string | number | boolean | undefined>;
}

// API response structure
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Create query string from params
const createQueryString = (params?: Record<string, string | number | boolean | undefined>): string => {
  if (!params) return '';
  
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return queryParams.length ? `?${queryParams.join('&')}` : '';
};

// Generic request function
export async function request<TResponse, TBody = unknown>(
  endpoint: string,
  options: RequestOptions<TBody> = { method: 'GET' }
): Promise<ApiResponse<TResponse>> {
  try {
    const { method, headers = {}, body, params } = options;
    
    // Build request URL with query parameters
    const queryString = createQueryString(params);
    const url = `${API_BASE_URL}${endpoint}${queryString}`;
    
    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };
    
    // Get auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: defaultHeaders,
      credentials: 'include',
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    // Execute request
    const response = await fetch(url, fetchOptions);
    
    // Parse JSON response
    const data = await response.json();
    
    // Handle API error responses
    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'An error occurred',
        error: data.error || `Request failed with status ${response.status}`
      };
    }
    
    return data as ApiResponse<TResponse>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: 'Failed to complete request',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) => 
    request<T>(endpoint, { method: 'GET', params }),
    
  post: <TResponse, TBody>(endpoint: string, body: TBody, params?: Record<string, string | number | boolean | undefined>) => 
    request<TResponse, TBody>(endpoint, { method: 'POST', body, params }),
    
  put: <TResponse, TBody>(endpoint: string, body: TBody, params?: Record<string, string | number | boolean | undefined>) => 
    request<TResponse, TBody>(endpoint, { method: 'PUT', body, params }),
    
  patch: <TResponse, TBody>(endpoint: string, body: TBody, params?: Record<string, string | number | boolean | undefined>) => 
    request<TResponse, TBody>(endpoint, { method: 'PATCH', body, params }),
    
  delete: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) => 
    request<T>(endpoint, { method: 'DELETE', params }),
};

export default api; 