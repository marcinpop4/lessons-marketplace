import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLessonById } from '../../api/lessonApi';
import LessonDetails from '../../components/features/lesson-confirmation/LessonDetails';
import './lesson-confirmation.css';
export default function LessonConfirmation() {
    const { lessonId } = useParams();
    const [lesson, setLesson] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        console.log('LessonConfirmation useEffect triggered with lessonId:', lessonId);
        if (lessonId) {
            console.log('Making API call to getLessonById');
            getLessonById(lessonId)
                .then((lesson) => {
                console.log('Successfully got lesson:', lesson);
                setLesson(lesson);
            })
                .catch((err) => {
                console.error('Error fetching lesson:', err);
                setError(err.message);
            });
        }
        else {
            console.log('No lessonId provided in URL params');
        }
    }, [lessonId]);
    if (error) {
        return _jsxs("div", { children: ["Error: ", error] });
    }
    if (!lesson) {
        return _jsx("div", { children: "Loading..." });
    }
    return (_jsxs("div", { className: "lesson-confirmation-container", children: [_jsx("h1", { children: "Lesson Confirmation" }), _jsx(LessonDetails, { quote: lesson.quote })] }));
}
