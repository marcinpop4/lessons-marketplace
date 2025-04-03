import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TeacherProfile from '../../components/features/teacher-dashboard/TeacherProfile';
import TeacherStats from '../../components/features/teacher-dashboard/TeacherStats';
import TeacherLessonRatesManager from '../../components/features/teacher-dashboard/TeacherLessonRatesManager';
import apiClient from '../../api/apiClient';
import axios from 'axios';
import './TeacherDashboard.css';
const TeacherDashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    useEffect(() => {
        // Check for registration success in sessionStorage
        const registrationSuccess = sessionStorage.getItem('registrationSuccess');
        if (registrationSuccess === 'true') {
            setShowSuccessMessage(true);
            // Remove the success flag from sessionStorage
            sessionStorage.removeItem('registrationSuccess');
        }
    }, []);
    useEffect(() => {
        // Hide success message after 5 seconds
        if (showSuccessMessage) {
            const timer = setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessMessage]);
    useEffect(() => {
        // Redirect if not logged in or not a teacher
        if (!user) {
            navigate('/auth');
            return;
        }
        if (user.userType !== 'TEACHER') {
            navigate('/');
            return;
        }
        // Fetch teacher profile and stats
        const fetchTeacherData = async () => {
            try {
                setLoading(true);
                // Use Promise.all to fetch profile and stats in parallel
                const [profileResponse, statsResponse] = await Promise.all([
                    apiClient.get('/api/v1/teachers/profile'),
                    apiClient.get('/api/v1/teachers/stats')
                ]);
                setProfile(profileResponse.data);
                setStats(statsResponse.data);
            }
            catch (err) {
                // Extract more detailed error information
                if (axios.isAxiosError(err)) {
                    const errorMessage = err.response?.data?.error || err.message;
                    const statusCode = err.response?.status;
                    setError(`Error (${statusCode}): ${errorMessage}`);
                }
                else {
                    setError(err instanceof Error ? err.message : 'An error occurred');
                }
            }
            finally {
                setLoading(false);
            }
        };
        fetchTeacherData();
    }, [user, navigate]);
    const handleLogout = () => {
        logout();
        navigate('/auth');
    };
    if (loading) {
        return (_jsx("div", { className: "card card-primary", children: _jsxs("div", { className: "card-body", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "Loading your dashboard..." }), _jsx("p", { children: "Please wait while we retrieve your information." })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "card card-primary", children: _jsxs("div", { className: "card-body", children: [_jsx("div", { className: "alert alert-error mb-4", children: _jsx("p", { children: error }) }), _jsx("button", { onClick: handleLogout, className: "btn btn-primary w-full", children: "Logout" })] }) }));
    }
    return (_jsxs("div", { className: "teacher-dashboard space-y-6", children: [showSuccessMessage && (_jsx("div", { className: "alert alert-success", children: "Registration successful!" })), _jsxs("div", { className: "dashboard-header", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Teacher Dashboard" }), _jsx("button", { className: "btn btn-secondary", onClick: handleLogout, children: "Logout" })] }), profile && (_jsxs("div", { className: "dashboard-content space-y-6", children: [_jsx(TeacherProfile, { profile: profile }), _jsx(TeacherLessonRatesManager, { lessonRates: profile.lessonRates, onRatesUpdated: (updatedRates) => {
                            setProfile({
                                ...profile,
                                lessonRates: updatedRates
                            });
                        } }), _jsx(TeacherStats, { stats: stats })] }))] }));
};
export default TeacherDashboardPage;
