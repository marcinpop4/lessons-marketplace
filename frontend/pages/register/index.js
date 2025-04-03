import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import RegisterForm from '@frontend/components/features/register/RegisterForm';
import { useAuth } from '@frontend/contexts/AuthContext';
import './register.css';
const RegisterPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const handleSuccess = () => {
        if (user?.userType === 'STUDENT') {
            navigate('/lesson-request', { replace: true });
        }
        else if (user?.userType === 'TEACHER') {
            navigate('/teacher-dashboard', { replace: true });
        }
        else {
            navigate('/', { replace: true });
        }
    };
    return (_jsx("div", { className: "register-form-container", children: _jsxs("div", { className: "card card-primary register-card", children: [_jsxs("div", { className: "card-header", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Create an Account" }), _jsx("p", { children: "Join Lessons Marketplace today" })] }), _jsxs("div", { className: "card-body", children: [_jsx(RegisterForm, { onSuccess: handleSuccess }), _jsx("div", { className: "mt-4 text-center", children: _jsxs("p", { children: ["Already have an account? ", _jsx("a", { href: "/login", className: "text-primary-600 hover:text-primary-700", children: "Sign in" })] }) })] })] }) }));
};
export default RegisterPage;
