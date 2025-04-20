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
  logout: async () => { },
  clearError: () => { },
  clearJustRegistered: () => { },
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

  // Initialize auth state
  const initializeAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  };

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

        // Initialize auth headers
        await initializeAuth();

        // Try to refresh the token
        try {
          const response = await apiClient.post(`/api/v1/auth/refresh-token`, {});

          // Save the new access token
          localStorage.setItem('auth_token', response.data.accessToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

          // Set user data from refresh response
          setUser(response.data.user);
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Clear auth state if not authenticated
          localStorage.removeItem('auth_token');
          delete axios.defaults.headers.common['Authorization'];
          delete apiClient.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear auth state if not authenticated
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
        delete apiClient.defaults.headers.common['Authorization'];
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
      const payload = {
        email,
        password,
        userType,
      };

      const response = await apiClient.post(`/api/v1/auth/login`, payload);

      if (response.data && response.data.accessToken) {
        setUser(response.data.user);
        localStorage.setItem('auth_token', response.data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed';
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

    try {
      const response = await apiClient.post(`/api/v1/auth/register`, registerData);

      if (response.data && response.data.accessToken) {
        setUser(response.data.user);
        setJustRegistered(true);
        localStorage.setItem('auth_token', response.data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
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
      await apiClient.post(`/api/v1/auth/logout`);

      // Clear the access token from localStorage
      localStorage.removeItem('auth_token');

      // Clear the access token from both axios instances
      delete axios.defaults.headers.common['Authorization'];
      delete apiClient.defaults.headers.common['Authorization'];

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