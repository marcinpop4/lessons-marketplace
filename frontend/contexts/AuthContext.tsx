// CACHE-BUSTER: 20250320101632
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
  justRegistered: boolean;
  login: (email: string, password: string, userType: 'STUDENT' | 'TEACHER') => Promise<boolean>;
  register: (userData: RegisterData) => Promise<User | null>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearJustRegistered: () => void;
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
  justRegistered: false,
  login: async () => false,
  register: async () => null,
  logout: async () => {},
  clearError: () => {},
  clearJustRegistered: () => {},
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
  const [justRegistered, setJustRegistered] = useState<boolean>(false);

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
      
      if (response.data && response.data.accessToken) {
        setUser(response.data.user);
        localStorage.setItem('auth_token', response.data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (registerData: RegisterData) => {
    setLoading(true);
    setError(null);
    console.log('Starting registration in AuthContext:', { ...registerData, password: '[REDACTED]' });
    
    try {
      const response = await apiClient.post(`/auth/register`, registerData);
      console.log('Registration API response:', response.data);
      
      if (response.data && response.data.accessToken) {
        setUser(response.data.user);
        setJustRegistered(true);
        localStorage.setItem('auth_token', response.data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        return response.data.user;
      }
      
      return null;
    } catch (error: any) {
      console.error('Registration error in AuthContext:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed';
      console.error('Setting error message:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
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

  // Clear justRegistered flag
  const clearJustRegistered = () => {
    setJustRegistered(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        justRegistered,
        login,
        register,
        logout,
        clearError,
        clearJustRegistered,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 