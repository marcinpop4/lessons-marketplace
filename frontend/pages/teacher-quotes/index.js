import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherQuotesList from '../../components/features/teacher-quotes/TeacherQuotesList';
import LessonRequestCard from '../../components/features/teacher-quotes/LessonRequestCard';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import './teacher-quotes.css';
const TeacherQuotesPage = () => {
    const navigate = useNavigate();
    const { lessonRequestId } = useParams();
    const [error, setError] = useState(null);
    const [lessonRequest, setLessonRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    // Fetch lesson request details
    useEffect(() => {
        const fetchLessonRequest = async () => {
            if (!lessonRequestId)
                return;
            try {
                const request = await getLessonRequestById(lessonRequestId);
                setLessonRequest(request);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch lesson request');
            }
            finally {
                setLoading(false);
            }
        };
        fetchLessonRequest();
    }, [lessonRequestId]);
    // Redirect if no lessonRequestId is provided
    useEffect(() => {
        if (!lessonRequestId) {
            navigate('/dashboard');
        }
    }, [lessonRequestId, navigate]);
    const handleBack = () => {
        navigate('/lesson-request');
    };
    const handleQuoteAccepted = (lessonId) => {
        navigate(`/lesson-confirmation/${lessonId}`);
    };
    const handleError = (errorMessage) => {
        setError(errorMessage);
    };
    if (loading) {
        return _jsx("div", { className: "loading", children: "Loading..." });
    }
    if (error) {
        return (_jsxs("div", { className: "error-container", children: [_jsx("div", { className: "alert alert-error", children: error }), _jsx("button", { onClick: handleBack, className: "btn btn-secondary", children: "Back to Lesson Request" })] }));
    }
    if (!lessonRequest || !lessonRequestId) {
        return (_jsxs("div", { className: "error-container", children: [_jsx("div", { className: "alert alert-error", children: "Lesson request not found" }), _jsx("button", { onClick: handleBack, className: "btn btn-secondary", children: "Back to Lesson Request" })] }));
    }
    return (_jsxs("div", { className: "teacher-quotes-page", children: [_jsxs("div", { className: "teacher-quotes-header", children: [_jsx("h2", { children: "Teacher Quotes" }), _jsx("p", { children: "Review quotes from our qualified teachers for your lesson request." })] }), error && (_jsx("div", { role: "alert", className: "alert alert-error mb-4", children: error })), _jsxs("div", { className: "teacher-quotes-container", children: [_jsxs("div", { className: "teacher-quotes-sidebar", children: [_jsx(LessonRequestCard, { lessonRequestId: lessonRequestId }), _jsx("div", { className: "teacher-quotes-actions", children: _jsx("button", { onClick: handleBack, className: "btn btn-secondary", children: "Back to Lesson Request" }) })] }), _jsx(TeacherQuotesList, { lessonRequestId: lessonRequestId, lessonType: lessonRequest.type, onQuoteAccepted: handleQuoteAccepted, onError: handleError })] })] }));
};
export default TeacherQuotesPage;
