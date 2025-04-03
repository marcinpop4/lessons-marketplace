import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';
import './LessonRateForm.css';
const LessonRateForm = ({ rate, onSubmit, onCancel }) => {
    const [type, setType] = useState('');
    const [rateInCents, setRateInCents] = useState('');
    const [amountInDollars, setAmountInDollars] = useState('');
    const [errors, setErrors] = useState({});
    // Reset form when rate changes (for editing)
    useEffect(() => {
        if (rate) {
            setType(rate.type);
            // Convert cents to dollars for display
            const dollars = (rate.rateInCents / 100).toFixed(2);
            setAmountInDollars(dollars);
            setRateInCents(rate.rateInCents.toString());
        }
        else {
            setType('');
            setAmountInDollars('');
            setRateInCents('');
        }
        setErrors({});
    }, [rate]);
    const handleAmountChange = (e) => {
        const value = e.target.value;
        setAmountInDollars(value);
        // Convert dollars to cents
        if (value) {
            const cents = Math.round(parseFloat(value) * 100);
            setRateInCents(cents.toString());
        }
        else {
            setRateInCents('');
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!type.trim()) {
            newErrors.type = 'Lesson type is required';
        }
        else {
            // We're using enum keys directly, so check if it's one of those
            const validTypes = Object.keys(LessonType);
            if (!validTypes.includes(type)) {
                newErrors.type = `Type must be a valid lesson type`;
            }
        }
        if (!amountInDollars) {
            newErrors.rate = 'Rate is required';
        }
        else if (isNaN(parseFloat(amountInDollars)) || parseFloat(amountInDollars) <= 0) {
            newErrors.rate = 'Rate must be a positive number';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        onSubmit({
            type,
            rateInCents: parseInt(rateInCents, 10)
        });
        // Reset form if not editing
        if (!rate) {
            setType('');
            setAmountInDollars('');
            setRateInCents('');
        }
    };
    return (_jsx("div", { className: "lesson-rate-form", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "lessonType", children: "Lesson Type" }), _jsxs("select", { id: "lessonType", value: type, onChange: (e) => setType(e.target.value), className: errors.type ? 'select-error' : '', children: [_jsx("option", { value: "", children: "Select a lesson type" }), Object.keys(LessonType).map(key => (_jsx("option", { value: key, children: formatDisplayLabel(key) }, key)))] }), errors.type && _jsx("div", { className: "error-message", children: errors.type })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "lessonRate", children: "Rate ($/hour)" }), _jsxs("div", { className: "rate-input-wrapper", children: [_jsx("span", { className: "currency-symbol", children: "$" }), _jsx("input", { id: "lessonRate", type: "number", step: "0.01", min: "0", value: amountInDollars, onChange: handleAmountChange, placeholder: "0.00", className: errors.rate ? 'input-error' : '' })] }), errors.rate && _jsx("div", { className: "error-message", children: errors.rate })] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "submit", className: "btn btn-primary", children: rate ? 'Update Rate' : 'Add Rate' }), rate && (_jsx("button", { type: "button", onClick: onCancel, className: "btn btn-secondary ml-2", children: "Cancel" }))] })] }) }));
};
export default LessonRateForm;
