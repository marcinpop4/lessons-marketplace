import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';
// Helper function to format date for input field
const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// Helper function to generate time options (9am to 8pm)
const generateTimeOptions = () => {
    const options = [];
    for (let hour = 9; hour <= 20; hour++) {
        const hourFormatted = hour % 12 === 0 ? 12 : hour % 12;
        const amPm = hour < 12 ? 'AM' : 'PM';
        options.push({
            value: `${hour.toString().padStart(2, '0')}:00`,
            label: `${hourFormatted}:00 ${amPm}`
        });
        options.push({
            value: `${hour.toString().padStart(2, '0')}:30`,
            label: `${hourFormatted}:30 ${amPm}`
        });
    }
    return options;
};
const LessonDetailsForm = ({ type, durationMinutes, selectedDate, selectedTime, onTypeChange, onDurationChange, onDateChange, onTimeChange }) => {
    const timeOptions = generateTimeOptions();
    return (_jsxs("div", { className: "card card-primary lesson-request-card", children: [_jsx("div", { className: "card-header", children: _jsx("h3", { children: "Lesson Details" }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "type", children: "Lesson Type" }), _jsx("select", { id: "type", name: "type", value: type, onChange: onTypeChange, required: true, children: Object.values(LessonType).map(type => (_jsx("option", { value: type, children: formatDisplayLabel(type) }, type))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "durationMinutes", children: "Duration (minutes)" }), _jsxs("select", { id: "durationMinutes", name: "durationMinutes", value: durationMinutes, onChange: onDurationChange, required: true, children: [_jsx("option", { value: 30, children: "30" }), _jsx("option", { value: 45, children: "45" }), _jsx("option", { value: 60, children: "60" }), _jsx("option", { value: 90, children: "90" })] })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "date", children: "Date" }), _jsx("input", { type: "date", id: "date", name: "date", value: selectedDate, onChange: onDateChange, min: formatDateForInput(new Date()), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "time", children: "Time" }), _jsxs("select", { id: "time", name: "time", value: selectedTime, onChange: onTimeChange, required: true, children: [_jsx("option", { value: "", children: "Select a time" }), timeOptions.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value)))] })] })] })] })] }));
};
export default LessonDetailsForm;
