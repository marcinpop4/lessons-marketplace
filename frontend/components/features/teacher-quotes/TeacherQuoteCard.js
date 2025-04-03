import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { createLessonFromQuote } from '@frontend/api/lessonApi';
import './TeacherQuoteCard.css';
const TeacherQuoteCard = ({ quote, onAccept }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleAccept = async () => {
        setLoading(true);
        setError(null);
        try {
            const lesson = await createLessonFromQuote(quote.id);
            onAccept(lesson.id);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept quote');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "card card-accent teacher-quote-card", children: [_jsx("div", { className: "card-header", children: _jsxs("h3", { children: [quote.teacher.firstName, " ", quote.teacher.lastName] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "quote-details", children: [_jsxs("div", { className: "quote-detail", children: [_jsx("span", { className: "detail-label", children: "Cost:" }), _jsx("span", { className: "detail-value", children: quote.getFormattedCost() })] }), _jsxs("div", { className: "quote-detail", children: [_jsx("span", { className: "detail-label", children: "Hourly Rate:" }), _jsxs("span", { className: "detail-value", children: ["$", (quote.hourlyRateInCents / 100).toFixed(2), "/hour"] })] }), error && (_jsx("div", { className: "alert alert-error", children: error }))] }), _jsx("div", { className: "quote-actions", children: _jsx("button", { onClick: handleAccept, disabled: loading || !quote.isValid(), className: "btn btn-accent", children: loading ? 'Accepting...' : 'Accept Quote' }) })] })] }));
};
export default TeacherQuoteCard;
