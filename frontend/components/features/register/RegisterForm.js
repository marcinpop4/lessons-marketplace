import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// CACHE-BUSTER: 20250320102127
import { useState } from 'react';
import { useAuth } from '@frontend/contexts/AuthContext';
import './RegisterForm.css';
const RegisterForm = ({ onSuccess }) => {
    const { register, error: authError, clearError } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [userType, setUserType] = useState('STUDENT');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Use the authError from context if it exists
    const displayError = error || authError;
    // Reset error when user makes changes to the form
    const resetErrorOnUserAction = () => {
        if (displayError) {
            setError(null);
            clearError();
        }
    };
    const handleFirstNameChange = (e) => {
        setFirstName(e.target.value);
        resetErrorOnUserAction();
    };
    const handleLastNameChange = (e) => {
        setLastName(e.target.value);
        resetErrorOnUserAction();
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        resetErrorOnUserAction();
    };
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        resetErrorOnUserAction();
    };
    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
        resetErrorOnUserAction();
    };
    const handlePhoneNumberChange = (e) => {
        setPhoneNumber(e.target.value);
        resetErrorOnUserAction();
    };
    const handleDateOfBirthChange = (e) => {
        setDateOfBirth(e.target.value);
        resetErrorOnUserAction();
    };
    const handleUserTypeChange = (newUserType) => {
        setUserType(newUserType);
        resetErrorOnUserAction();
    };
    const validateForm = () => {
        // Password validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }
        return true;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!firstName || !lastName || !email || !password || !confirmPassword || !phoneNumber || !dateOfBirth) {
            setError('Please fill in all fields');
            return;
        }
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            const registerSuccess = await register({
                firstName,
                lastName,
                email,
                password,
                phoneNumber,
                dateOfBirth,
                userType
            });
            if (registerSuccess) {
                setSuccess(true);
                // Reset form
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setPhoneNumber('');
                setDateOfBirth('');
                if (onSuccess) {
                    onSuccess();
                }
            }
            // If register returned false, the error should already be set in auth context
        }
        catch (error) {
            // This should only happen for unexpected errors
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "register-form", children: [success && (_jsxs("div", { className: "alert alert-success", children: [_jsx("div", { className: "alert-icon", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }) }), "Registration successful! You can now log in."] })), displayError && (_jsxs("div", { className: "alert alert-error", children: [_jsx("div", { className: "alert-icon", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }) }), displayError, _jsx("button", { onClick: () => {
                            setError(null);
                            clearError();
                        }, className: "clear-error-btn", "aria-label": "Clear error message", children: _jsx("span", { children: "\u00D7" }) })] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "firstName", children: "First Name" }), _jsx("input", { id: "firstName", type: "text", value: firstName, onChange: handleFirstNameChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "lastName", children: "Last Name" }), _jsx("input", { id: "lastName", type: "text", value: lastName, onChange: handleLastNameChange, required: true })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: handleEmailChange, required: true })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "registerPassword", children: "Password" }), _jsx("input", { id: "registerPassword", name: "password", type: "password", value: password, onChange: handlePasswordChange, required: true, "aria-label": "Create password" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "confirmPassword", children: "Confirm Password" }), _jsx("input", { id: "confirmPassword", name: "confirmPassword", type: "password", value: confirmPassword, onChange: handleConfirmPasswordChange, required: true, "aria-label": "Confirm password" })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "phoneNumber", children: "Phone Number" }), _jsx("input", { id: "phoneNumber", type: "tel", value: phoneNumber, onChange: handlePhoneNumberChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "dateOfBirth", children: "Date of Birth" }), _jsx("input", { id: "dateOfBirth", type: "date", value: dateOfBirth, onChange: handleDateOfBirthChange, required: true })] })] }), _jsx("div", { className: "form-group user-type", children: _jsxs("div", { className: "radio-group", children: [_jsx("input", { id: "studentType", type: "radio", name: "userType", value: "STUDENT", checked: userType === 'STUDENT', onChange: () => handleUserTypeChange('STUDENT') }), _jsx("label", { htmlFor: "studentType", children: "Student" }), _jsx("input", { id: "teacherType", type: "radio", name: "userType", value: "TEACHER", checked: userType === 'TEACHER', onChange: () => handleUserTypeChange('TEACHER') }), _jsx("label", { htmlFor: "teacherType", children: "Teacher" })] }) }), _jsx("button", { type: "submit", disabled: isSubmitting, className: isSubmitting ? 'loading' : '', children: isSubmitting ? 'Registering...' : 'Register' })] })] }));
};
export default RegisterForm;
