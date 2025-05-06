import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi';
import TeacherLessonDetailCard from '@frontend/components/TeacherLessonDetailCard';
import StudentObjectivesDisplay from '@frontend/components/teacher/StudentObjectivesDisplay';
import Button from '@frontend/components/shared/Button/Button';

const TeacherLessonDetailsPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Lesson Data Effect --- 
    useEffect(() => {
        if (!lessonId) {
            setError('Lesson ID is missing from URL.');
            setIsLoading(false);
            return;
        }

        const fetchLessonData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const fetchedLesson = await getLessonById(lessonId);

                if (!fetchedLesson) {
                    setError(`Lesson with ID ${lessonId} not found or could not be loaded.`);
                    setLesson(null);
                } else {
                    setLesson(fetchedLesson);
                }

            } catch (err) {
                console.error("Error fetching lesson data:", err);
                setError(err instanceof Error ? err.message : 'Failed to load lesson details.');
                setLesson(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLessonData();
    }, [lessonId]);

    const handleCompleteLesson = async () => {
        if (!lessonId || !lesson) return;

        setIsSaving(true);
        setError(null);
        try {
            await updateLessonStatus(lessonId, LessonStatusTransition.COMPLETE);
            navigate(-1);

        } catch (err) {
            console.error("Error completing lesson status:", err);
            setError(err instanceof Error ? err.message : 'Failed to complete lesson.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    if (!lessonId) {
        return <div className="text-red-500 p-4">Error: Lesson ID is missing from URL.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 h-screen">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                    Loading...
                </p>
            </div>
        );
    }

    if (error && !isSaving) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    if (!lesson) {
        return <div className="p-4">Lesson data could not be loaded. {error || ''}</div>;
    }

    const studentId = lesson.quote.lessonRequest.student?.id;
    const lessonType = lesson.quote.lessonRequest?.type;
    const canCompleteLesson = lesson.currentStatus?.status === LessonStatusValue.ACCEPTED;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Lesson Details</h1>

            <TeacherLessonDetailCard lesson={lesson} />

            {studentId && lessonType && (
                <StudentObjectivesDisplay studentId={studentId} lessonType={lessonType} />
            )}

            <div className="flex justify-end space-x-4 mt-6">
                <Button onClick={handleCancel} variant="secondary" disabled={isSaving}>Cancel</Button>
                {canCompleteLesson && (
                    <Button onClick={handleCompleteLesson}
                        disabled={isSaving}
                        variant="primary"
                    >
                        {isSaving ? 'Processing...' : 'Complete Lesson'}
                    </Button>
                )}
                {isSaving && error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
            </div>
        </div>
    );
};

export default TeacherLessonDetailsPage; 