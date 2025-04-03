import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import LessonRequestForm from '@frontend/components/features/lesson-request/LessonRequestForm';
import './lesson-request.css';
const LessonRequestPage = () => {
    const navigate = useNavigate();
    const handleSubmitSuccess = (lessonRequestId) => {
        navigate(`/teacher-quotes/${lessonRequestId}`);
    };
    return (_jsxs("div", { className: "lesson-request-page", children: [_jsxs("div", { className: "lesson-request-page-header", children: [_jsx("h1", { children: "Request a Lesson" }), _jsx("p", { children: "Fill out the form below to request a lesson with one of our qualified teachers." })] }), _jsx(LessonRequestForm, { onSubmitSuccess: handleSubmitSuccess })] }));
};
export default LessonRequestPage;
