import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import LessonRateList from './LessonRateList';
import LessonRateForm from './LessonRateForm';
import apiClient from '../../../api/apiClient';
import axios from 'axios';
import './TeacherLessonRatesManager.css';
const TeacherLessonRatesManager = ({ lessonRates = [], onRatesUpdated }) => {
    const [editingRate, setEditingRate] = useState(null);
    const [error, setError] = useState(null);
    const handleAddOrUpdate = async (rate) => {
        try {
            setError(null);
            // The API expects lessonType and rateInCents parameters
            // When editing, include the ID to ensure we're updating the correct rate
            const apiPayload = {
                lessonType: rate.type,
                rateInCents: rate.rateInCents,
                ...(editingRate ? { id: editingRate.id } : {})
            };
            // Always use POST to /teachers/lesson-rates as the API uses upsert logic
            const updatedRate = await apiClient.post('/api/v1/teachers/lesson-rates', apiPayload);
            // Update the rates list
            if (editingRate) {
                // If editing, replace the old rate with the updated one
                const updatedRates = lessonRates.map(r => r.id === editingRate.id ? updatedRate.data : r);
                onRatesUpdated(updatedRates);
            }
            else {
                // If adding new, append to the list
                onRatesUpdated([...lessonRates, updatedRate.data]);
            }
            setEditingRate(null);
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                // Use HTTP status codes to better categorize errors
                const status = err.response?.status || 0;
                const apiError = err.response?.data?.message || err.message;
                if (status === 409) {
                    // 409 Conflict - Resource already exists
                    setError(`You already have a rate for ${rate.type} lessons. Please edit the existing rate instead.`);
                }
                else if (status === 400) {
                    // General validation error
                    setError(`Failed to save lesson rate: ${apiError}`);
                }
                else if (status >= 500) {
                    // Server errors
                    setError('Server error occurred. Please try again later.');
                }
                else {
                    // Other errors
                    setError(`Failed to save lesson rate: ${apiError}`);
                }
            }
            else {
                setError('Failed to save lesson rate. Please try again.');
            }
            console.error('Error saving lesson rate:', err);
        }
    };
    const handleToggleActive = async (rate) => {
        try {
            setError(null);
            // The API expects lessonType in the body
            const apiPayload = {
                lessonType: rate.type
            };
            // Use the appropriate endpoint based on current status
            const endpoint = rate.isActive
                ? '/api/v1/teachers/lesson-rates/deactivate'
                : '/api/v1/teachers/lesson-rates/reactivate';
            const updatedRate = await apiClient.post(endpoint, apiPayload);
            // Update the rates list
            const updatedRates = lessonRates.map(r => r.type === rate.type ? updatedRate.data : r);
            onRatesUpdated(updatedRates);
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                // Use HTTP status codes to better categorize errors
                const status = err.response?.status || 0;
                const apiError = err.response?.data?.message || err.message;
                if (status === 409) {
                    // 409 Conflict
                    setError(`Cannot update status for ${rate.type} rate. There may be a conflict.`);
                }
                else if (status === 400) {
                    // Bad Request
                    setError(`Failed to update lesson rate status: ${apiError}`);
                }
                else if (status >= 500) {
                    // Server errors
                    setError('Server error occurred. Please try again later.');
                }
                else {
                    // Other errors
                    setError(`Failed to update lesson rate status: ${apiError}`);
                }
            }
            else {
                setError('Failed to update lesson rate status. Please try again.');
            }
            console.error('Error updating lesson rate status:', err);
        }
    };
    const handleEdit = (rate) => {
        setEditingRate(rate);
    };
    const handleCancel = () => {
        setEditingRate(null);
    };
    return (_jsxs("div", { className: "lesson-rates-manager", children: [_jsx("h2", { className: "text-2xl font-semibold mb-6", children: "Lesson Rates Management" }), error && _jsx("div", { className: "alert alert-error mb-4", children: error }), _jsxs("div", { className: "rates-layout", children: [_jsx("div", { className: "rates-form-container", children: _jsxs("div", { className: "card card-accent", children: [_jsx("div", { className: "card-header", children: _jsx("h3", { className: "text-xl font-semibold", children: "Add New Rate" }) }), _jsx("div", { className: "card-body", children: _jsx(LessonRateForm, { rate: editingRate, onSubmit: handleAddOrUpdate, onCancel: handleCancel }) })] }) }), _jsx("div", { className: "rates-list-container", children: _jsxs("div", { className: "card card-accent", children: [_jsx("div", { className: "card-header", children: _jsx("h3", { className: "text-xl font-semibold", children: "Your Lesson Rates" }) }), _jsx("div", { className: "card-body", children: _jsx(LessonRateList, { rates: lessonRates, onToggleActive: handleToggleActive, onEdit: handleEdit }) })] }) })] })] }));
};
export default TeacherLessonRatesManager;
