import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import { FormattedDateTime, FormattedAddress } from '@frontend/components/shared';
import { formatDisplayLabel } from '@shared/models/LessonType';
import './LessonRequestCard.css';
const LessonRequestCard = ({ lessonRequestId }) => {
    const [lessonRequest, setLessonRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchLessonRequest = async () => {
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
    if (loading) {
        return _jsx("div", { children: "Loading..." });
    }
    if (error) {
        return _jsx("div", { className: "error", children: error });
    }
    if (!lessonRequest) {
        return _jsx("div", { children: "Lesson request not found" });
    }
    return (_jsxs("div", { className: "card card-primary lesson-request-card", children: [_jsx("div", { className: "card-header", children: _jsx("h3", { children: "Lesson Request Details" }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "lesson-request-details", children: [_jsxs("div", { className: "lesson-request-detail", children: [_jsx("span", { className: "detail-label", children: "Lesson Type:" }), _jsx("span", { className: "detail-value", children: formatDisplayLabel(lessonRequest.type) })] }), _jsxs("div", { className: "lesson-request-detail", children: [_jsx("span", { className: "detail-label", children: "Duration:" }), _jsxs("span", { className: "detail-value", children: [lessonRequest.durationMinutes, " minutes"] })] }), _jsxs("div", { className: "lesson-request-detail", children: [_jsx("span", { className: "detail-label", children: "Date & Time:" }), _jsx("span", { className: "detail-value", children: _jsx(FormattedDateTime, { date: lessonRequest.startTime }) })] }), _jsxs("div", { className: "lesson-request-detail", children: [_jsx("span", { className: "detail-label", children: "Location:" }), _jsx("span", { className: "detail-value", children: _jsx(FormattedAddress, { address: lessonRequest.address }) })] })] }) })] }));
};
export default LessonRequestCard;
