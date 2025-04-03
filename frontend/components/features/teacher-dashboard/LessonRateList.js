import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDisplayLabel } from '@shared/models/LessonType';
import './LessonRateList.css';
const LessonRateList = ({ rates = [], onToggleActive, onEdit }) => {
    // Format the amount in dollars
    const formatAmount = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };
    // Format date to a readable format
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };
    if (!rates || rates.length === 0) {
        return (_jsx("div", { className: "lesson-rate-list", children: _jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "No lesson rates have been set up yet." }), _jsx("p", { children: "Add your first lesson rate to get started." })] }) }));
    }
    return (_jsx("div", { className: "lesson-rate-list", children: _jsx("div", { className: "rates-grid", children: rates.map(rate => (_jsxs("div", { className: `rate-card ${rate.isActive ? 'active' : 'inactive'}`, children: [_jsxs("div", { className: "rate-header", children: [_jsx("h4", { children: formatDisplayLabel(rate.type) }), _jsxs("div", { className: "rate-actions", children: [_jsx("button", { onClick: () => onEdit(rate), className: "btn btn-primary btn-sm", title: "Edit rate", children: "Edit" }), _jsx("button", { onClick: () => onToggleActive(rate), className: `btn btn-secondary btn-sm`, title: rate.isActive ? 'Deactivate rate' : 'Activate rate', children: rate.isActive ? 'Deactivate' : 'Activate' })] })] }), _jsxs("div", { className: "rate-details", children: [_jsxs("p", { className: "rate-amount", children: [formatAmount(rate.rateInCents), "/hour"] }), _jsxs("p", { className: "rate-status", children: ["Status: ", _jsx("span", { className: rate.isActive ? 'active' : 'inactive', children: rate.isActive ? 'Active' : 'Inactive' })] }), rate.deactivatedAt && (_jsxs("p", { className: "deactivation-date", children: ["Deactivated: ", formatDate(rate.deactivatedAt)] }))] })] }, rate.id))) }) }));
};
export default LessonRateList;
