import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LessonType } from '@shared/models/LessonType';
import { Address } from '@shared/models/Address';
import { LessonRequest } from '@shared/models/LessonRequest';
import { createLessonRequest } from '@frontend/api/lessonRequestApi';
import { useAuth } from '@frontend/contexts/AuthContext';
import LessonDetailsForm from './LessonDetailsForm';
import AddressForm from './AddressForm';
import './LessonRequestForm.css';
const LessonRequestForm = ({ onSubmitSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [formData, setFormData] = useState({
        type: LessonType.GUITAR,
        startTime: new Date(),
        durationMinutes: 30,
        addressObj: new Address('', '', '', '', 'USA'),
        studentId: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    useEffect(() => {
        if (!user) {
            navigate('/auth', { replace: true });
            return;
        }
        if (user.userType !== 'STUDENT') {
            navigate('/', { replace: true });
            return;
        }
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
        setFormData(prevData => ({
            ...prevData,
            studentId: user.id
        }));
    }, [user, navigate]);
    useEffect(() => {
        if (selectedDate && selectedTime) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const date = new Date(selectedDate);
            date.setHours(hours || 0, minutes || 0);
            setFormData(prevData => ({
                ...prevData,
                startTime: date
            }));
        }
    }, [selectedDate, selectedTime]);
    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };
    const handleTimeChange = (e) => {
        const newTime = e.target.value;
        setSelectedTime(newTime);
        if (newTime && selectedDate) {
            const [hours, minutes] = newTime.split(':').map(Number);
            const date = new Date(selectedDate);
            date.setHours(hours || 0, minutes || 0);
            const tempRequest = new LessonRequest('', formData.type, date, formData.durationMinutes, formData.addressObj, {});
            if (tempRequest.isLessonEndingAfter9pm()) {
                setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
            }
            else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
                setError(null);
            }
        }
    };
    const handleTypeChange = (e) => {
        const { value } = e.target;
        const lessonType = Object.values(LessonType).includes(value)
            ? value
            : LessonType.GUITAR;
        setFormData(prevData => ({
            ...prevData,
            type: lessonType
        }));
    };
    const handleDurationChange = (e) => {
        const { value } = e.target;
        const durationValue = parseInt(value, 10);
        if (selectedTime && selectedDate) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const date = new Date(selectedDate);
            date.setHours(hours || 0, minutes || 0);
            const tempRequest = new LessonRequest('', formData.type, date, durationValue, formData.addressObj, {});
            if (tempRequest.isLessonEndingAfter9pm()) {
                setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
            }
            else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
                setError(null);
            }
        }
        setFormData(prevData => ({
            ...prevData,
            durationMinutes: durationValue
        }));
    };
    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        const addressField = name.split('.')[1];
        setFormData(prevData => ({
            ...prevData,
            addressObj: {
                ...prevData.addressObj,
                [addressField]: value
            }
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) {
            setError('Please select both a date and time for the lesson.');
            return;
        }
        // Create a new Date object with the selected date and time
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const date = new Date(selectedDate);
        date.setHours(hours || 0, minutes || 0);
        const tempRequest = new LessonRequest('', formData.type, date, formData.durationMinutes, formData.addressObj, {});
        if (tempRequest.isLessonEndingAfter9pm()) {
            setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
            return;
        }
        const { street, city, state, postalCode } = formData.addressObj;
        if (!street || !city || !state || !postalCode) {
            setError('Please fill in all address fields.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Convert to API payload format
            const payload = {
                type: formData.type,
                startTime: date,
                durationMinutes: formData.durationMinutes,
                addressObj: formData.addressObj,
                studentId: formData.studentId
            };
            const { lessonRequest } = await createLessonRequest(payload);
            setShowSuccessMessage(true);
            if (onSubmitSuccess && lessonRequest.id) {
                onSubmitSuccess(lessonRequest.id);
            }
            // Reset form
            setFormData({
                type: LessonType.GUITAR,
                startTime: new Date(),
                durationMinutes: 30,
                addressObj: new Address('', '', '', '', 'USA'),
                studentId: user?.id || ''
            });
            setSelectedTime('');
            setSelectedDate(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while submitting the form.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "lesson-request-form", children: [showSuccessMessage && (_jsx("div", { className: "alert alert-success", children: "Lesson request submitted successfully!" })), error && (_jsx("div", { className: "alert alert-error", children: error })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "lesson-request-cards", children: [_jsx(LessonDetailsForm, { type: formData.type, durationMinutes: formData.durationMinutes, selectedDate: selectedDate, selectedTime: selectedTime, onTypeChange: handleTypeChange, onDurationChange: handleDurationChange, onDateChange: handleDateChange, onTimeChange: handleTimeChange }), _jsx(AddressForm, { address: formData.addressObj, onChange: handleAddressChange })] }), _jsx("button", { type: "submit", disabled: loading, children: loading ? 'Submitting...' : 'Submit Request' })] })] }));
};
export default LessonRequestForm;
