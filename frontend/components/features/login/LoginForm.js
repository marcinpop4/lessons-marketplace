import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// CACHE-BUSTER: 20250320101632
import { useState } from 'react';
import { useAuth } from '@frontend/contexts/AuthContext';
import './LoginForm.css';
const LoginForm = ({ onSuccess }) => {
    const { login, error: authError, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('STUDENT');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Use the authError from context if it exists
    const displayError = error || authError;
    // Reset error only when user makes changes to the form
    const resetErrorOnUserAction = () => {
        if (displayError) {
            setError(null);
            clearError();
        }
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        resetErrorOnUserAction();
    };
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        resetErrorOnUserAction();
    };
    const handleUserTypeChange = (newUserType) => {
        setUserType(newUserType);
        resetErrorOnUserAction();
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setIsSubmitting(true);
        console.log('Attempting login...');
        try {
            const loginSuccess = await login(email, password, userType);
            console.log('Login result:', { loginSuccess, authError });
            if (loginSuccess) {
                setSuccess(true);
                if (onSuccess) {
                    onSuccess();
                }
            }
            // If login returned false, the error should already be set in the auth context
            // We don't need to do anything here as we're using displayError = error || authError
        }
        catch (error) {
            // This should only happen for unexpected errors, not auth failures
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred. Please try again.');
        }
        finally {
            setIsSubmitting(false);
            console.log('Final state:', { error, authError, displayError });
        }
    };
    return (_jsxs("div", { className: "login-form", children: [success && (_jsxs("div", { className: "alert alert-success", children: [_jsx("div", { className: "alert-icon", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }) }), "You have successfully logged in!"] })), displayError && (_jsxs("div", { className: "alert-error alert", children: [_jsx("div", { className: "alert-icon", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }) }), displayError, _jsx("button", { onClick: () => {
                            setError(null);
                            clearError();
                        }, className: "clear-error-btn", "aria-label": "Clear error message", children: _jsx("span", { children: "\u00D7" }) })] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("div", { className: "form-row", children: _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: "Email Address" }), _jsx("input", { id: "email", type: "email", value: email, onChange: handleEmailChange, required: true })] }) }), _jsx("div", { className: "form-row", children: _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: handlePasswordChange, required: true })] }) }), _jsxs("div", { className: "user-type-container", children: [_jsx("label", { className: "user-type-label", children: "I am a:" }), _jsxs("div", { className: "user-type-options", children: [_jsxs("div", { className: "user-type-option", children: [_jsx("input", { type: "radio", id: "student", name: "userType", value: "STUDENT", checked: userType === 'STUDENT', onChange: () => handleUserTypeChange('STUDENT') }), _jsx("label", { htmlFor: "student", children: "Student" })] }), _jsxs("div", { className: "user-type-option", children: [_jsx("input", { type: "radio", id: "teacher", name: "userType", value: "TEACHER", checked: userType === 'TEACHER', onChange: () => handleUserTypeChange('TEACHER') }), _jsx("label", { htmlFor: "teacher", children: "Teacher" })] })] })] }), _jsx("div", { className: "form-actions", children: _jsx("button", { type: "submit", className: "btn btn-primary", disabled: isSubmitting, children: isSubmitting ? 'Logging in...' : 'Login' }) })] })] }));
};
export default LoginForm;
