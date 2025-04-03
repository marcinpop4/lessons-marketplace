import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getLessonQuotesByRequestId } from '@frontend/api/lessonQuotesApi';
import { createLessonQuotes } from '@frontend/api/teacherQuoteApi';
import TeacherQuoteCard from './TeacherQuoteCard';
import './TeacherQuotesList.css';
const TeacherQuotesList = ({ lessonRequestId, lessonType, onQuoteAccepted, onError }) => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchQuotes = async () => {
        try {
            const quotesData = await getLessonQuotesByRequestId(lessonRequestId);
            setQuotes(quotesData);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quotes';
            setError(errorMessage);
            onError(errorMessage);
        }
    };
    useEffect(() => {
        fetchQuotes();
    }, [lessonRequestId]);
    const handleCreateQuotes = async () => {
        setLoading(true);
        setError(null);
        try {
            const newQuotes = await createLessonQuotes(lessonRequestId, lessonType);
            if (newQuotes.length === 0) {
                setError('No more teachers available for quotes');
                return;
            }
            // Update the quotes list
            setQuotes(prevQuotes => [...prevQuotes, ...newQuotes]);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create quotes';
            setError(errorMessage);
            onError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    const handleQuoteAccepted = (lessonId) => {
        onQuoteAccepted(lessonId);
    };
    return (_jsxs("div", { className: "teacher-quotes-list", children: [error && (_jsx("div", { className: "alert alert-error", children: error })), quotes.length === 0 ? (_jsxs("div", { className: "no-quotes", children: [_jsx("p", { children: "No quotes available yet." }), _jsx("button", { onClick: handleCreateQuotes, disabled: loading, className: "btn btn-primary", children: loading ? 'Creating Quotes...' : 'Get Quotes' })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "quotes-grid", children: quotes.map(quote => (_jsx(TeacherQuoteCard, { quote: quote, onAccept: handleQuoteAccepted }, quote.id))) }), quotes.length < 5 && (_jsx("div", { className: "get-more-quotes", children: _jsx("button", { onClick: handleCreateQuotes, disabled: loading, className: "btn btn-secondary", children: loading ? 'Creating Quotes...' : 'Get More Quotes' }) }))] }))] }));
};
export default TeacherQuotesList;
