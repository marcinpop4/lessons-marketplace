import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@frontend/components/features/login/LoginForm';
import { useAuth } from '@frontend/contexts/AuthContext';
import './login.css';
const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const handleSuccess = () => {
        const { from } = location.state || {};
        if (user?.userType === 'STUDENT') {
            navigate('/lesson-request', { replace: true });
        }
        else if (user?.userType === 'TEACHER') {
            navigate('/teacher-dashboard', { replace: true });
        }
        else if (from) {
            navigate(from.pathname, { replace: true });
        }
        else {
            navigate('/', { replace: true });
        }
    };
    return (_jsx("div", { className: "login-form-container", children: _jsxs("div", { className: "card card-primary login-card", children: [_jsxs("div", { className: "card-header", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Welcome Back" }), _jsx("p", { children: "Sign in to your account" })] }), _jsxs("div", { className: "card-body", children: [_jsx(LoginForm, { onSuccess: handleSuccess }), _jsx("div", { className: "mt-4 text-center", children: _jsxs("p", { children: ["Don't have an account? ", _jsx("a", { href: "/register", className: "text-primary-600 hover:text-primary-700", children: "Create one" })] }) })] })] }) }));
};
export default LoginPage;
