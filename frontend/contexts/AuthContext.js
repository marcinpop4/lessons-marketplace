import { jsx as _jsx } from "react/jsx-runtime";
// CACHE-BUSTER: 20250320101632
import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../api/apiClient';
// Create context with default values
const AuthContext = createContext({
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
// Create provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [justRegistered, setJustRegistered] = useState(false);
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
                }
                catch (error) {
                    console.error('Token refresh failed:', error);
                    // Clear auth state if not authenticated
                    localStorage.removeItem('auth_token');
                    delete axios.defaults.headers.common['Authorization'];
                    delete apiClient.defaults.headers.common['Authorization'];
                    setUser(null);
                }
            }
            catch (error) {
                console.error('Auth check failed:', error);
                // Clear auth state if not authenticated
                localStorage.removeItem('auth_token');
                delete axios.defaults.headers.common['Authorization'];
                delete apiClient.defaults.headers.common['Authorization'];
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        };
        checkAuthStatus();
    }, []);
    // Login function
    const login = async (email, password, userType) => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                email,
                password,
                userType,
            };
            console.log('Login request payload:', payload);
            const response = await apiClient.post(`/api/v1/auth/login`, payload);
            console.log('Login result:', response.data);
            if (response.data && response.data.accessToken) {
                setUser(response.data.user);
                localStorage.setItem('auth_token', response.data.accessToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.error || 'Login failed';
            setError(errorMessage);
            return false;
        }
        finally {
            setLoading(false);
        }
    };
    // Register function
    const register = async (registerData) => {
        setLoading(true);
        setError(null);
        console.log('Starting registration in AuthContext:', { ...registerData, password: '[REDACTED]' });
        try {
            const response = await apiClient.post(`/api/v1/auth/register`, registerData);
            console.log('Registration API response:', response.data);
            if (response.data && response.data.accessToken) {
                setUser(response.data.user);
                setJustRegistered(true);
                localStorage.setItem('auth_token', response.data.accessToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
                return response.data.user;
            }
            return null;
        }
        catch (error) {
            console.error('Registration error in AuthContext:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed';
            console.error('Setting error message:', errorMessage);
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        finally {
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
        }
        catch (error) {
            setError(error.response?.data?.error || 'Logout failed');
        }
        finally {
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
    return (_jsx(AuthContext.Provider, { value: {
            user,
            loading,
            error,
            justRegistered,
            login,
            register,
            logout,
            clearError,
            clearJustRegistered,
        }, children: children }));
};
// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
export default AuthContext;
