import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import apiClient from '../api/apiClient';

// User interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'STUDENT' | 'TEACHER';
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, userType: 'STUDENT' | 'TEACHER') => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Register data interface
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  userType: 'STUDENT' | 'TEACHER';
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  clearError: () => {},
});

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Create provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Configure axios to include credentials
  axios.defaults.withCredentials = true;

  // Set auth token from localStorage if it exists when the app loads
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        // Skip attempting to refresh if we don't have a token yet
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Try to get user data using the refresh token
        const response = await apiClient.post(`/auth/refresh-token`, {});
        
        // Save the new access token to localStorage
        localStorage.setItem('auth_token', response.data.accessToken);
        
        // Set the new access token in axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        
        // Get user data
        const userResponse = await apiClient.get(`/auth/me`);
        
        setUser(userResponse.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear user if not authenticated
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string, userType: 'STUDENT' | 'TEACHER') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(`/auth/login`, {
        email,
        password,
        userType,
      });
      
      // Save the access token to localStorage
      localStorage.setItem('auth_token', response.data.accessToken);
      
      // Set the access token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      
      // Set user data
      setUser(response.data.user);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(`/auth/register`, userData);
      
      // Save the access token to localStorage
      localStorage.setItem('auth_token', response.data.accessToken);
      
      // Set the access token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      
      // Set user data
      setUser(response.data.user);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    
    try {
      await apiClient.post(`/auth/logout`);
      
      // Clear the access token from localStorage
      localStorage.removeItem('auth_token');
      
      // Clear the access token
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear user data
      setUser(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 