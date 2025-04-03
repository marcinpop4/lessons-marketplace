import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth, AuthProvider } from '@frontend/contexts/AuthContext';
import LoginPage from '@frontend/pages/login';
import RegisterPage from '@frontend/pages/register';
import LessonRequestPage from '@frontend/pages/lesson-request';
import TeacherQuotesPage from './pages/teacher-quotes';
import LessonConfirmation from '@frontend/pages/lesson-confirmation';
import TeacherDashboard from '@frontend/pages/TeacherDashboard';
import ThemeDemoPage from '@frontend/pages/theme-demo';
import ProtectedRoute from '@frontend/components/common/ProtectedRoute';
import { ThemeSwitcher } from '@frontend/components/shared';
import ThemeProvider from '@frontend/contexts/ThemeContext';
import './App.css';
// Import CSS in the correct order: base styles, theme, components
import '@frontend/index.css';
import '@frontend/styles/theme.css';
import '@frontend/styles/components.css';
// Root redirect component to handle user type specific redirects
const RootRedirect = () => {
    const { user } = useAuth();
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (user.userType === 'TEACHER') {
        return _jsx(Navigate, { to: "/teacher-dashboard", replace: true });
    }
    if (user.userType === 'STUDENT') {
        return _jsx(Navigate, { to: "/lesson-request", replace: true });
    }
    return _jsx(Navigate, { to: "/login", replace: true });
};
// Inner component to use hooks
const AppRoutes = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const handleBackFromQuotes = () => {
        navigate('/lesson-request');
    };
    return (_jsxs("div", { className: "app-container", children: [_jsxs("header", { className: "header", children: [_jsxs("div", { className: "logo-container", children: [_jsx("img", { src: "/assets/images/lessons-marketplace.png", alt: "Lessons Marketplace Logo", className: "logo" }), _jsx(Link, { to: "/", className: "hover:text-primary-600 transition-colors", children: _jsx("h1", { children: "Take lessons and Git Gud!" }) })] }), _jsx("div", { className: "flex items-center", children: _jsx(ThemeSwitcher, { className: "flex items-center" }) })] }), _jsx("main", { className: "main-content animate-slide-up", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/theme-demo", element: _jsx(ThemeDemoPage, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, { userTypes: ['STUDENT'] }), children: _jsx(Route, { path: "/lesson-request", element: _jsx(LessonRequestPage, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { userTypes: ['TEACHER'] }), children: _jsx(Route, { path: "/teacher-dashboard", element: _jsx(TeacherDashboard, {}) }) }), _jsxs(Route, { element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { path: "/teacher-quotes/:lessonRequestId", element: _jsx(TeacherQuotesPage, {}) }), _jsx(Route, { path: "/lesson-confirmation/:lessonId", element: _jsx(LessonConfirmation, {}) })] }), _jsx(Route, { path: "/", element: _jsx(RootRedirect, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }) }), _jsxs("div", { className: "footer", children: [_jsx("p", { children: "Welcome to the Lessons Marketplace project" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "/theme-demo", children: "Theme Demo" }), _jsx(Link, { to: "/login", children: "Login" }), _jsx(Link, { to: "/register", children: "Register" })] })] })] }));
};
function App() {
    return (_jsx(AuthProvider, { children: _jsx(ThemeProvider, { children: _jsx(Router, { children: _jsx(AppRoutes, {}) }) }) }));
}
export default App;
