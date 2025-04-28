import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { Goal } from '@shared/models/Goal';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi';
import { getGoalsByLessonId } from '@frontend/api/goalApi';
import TeacherLessonDetailCard from '@frontend/components/TeacherLessonDetailCard';
import StudentObjectivesDisplay from '@frontend/components/teacher/StudentObjectivesDisplay';
import GoalManager from '@frontend/components/GoalManager';
import Button from '@frontend/components/shared/Button/Button';
import { GoalStatusValue } from '@shared/models/GoalStatus';
import AddGoalForm from '@frontend/components/AddGoalForm';

const TeacherLessonDetailsPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
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

                const [fetchedLesson, fetchedGoals] = await Promise.all([
                    getLessonById(lessonId),
                    getGoalsByLessonId(lessonId)
                ]);

                if (!fetchedLesson) {
                    setError(`Lesson with ID ${lessonId} not found or could not be loaded.`);
                    setLesson(null);
                    setGoals([]);
                } else {
                    setLesson(fetchedLesson);
                    setGoals(fetchedGoals || []);
                }

            } catch (err) {
                console.error("Error fetching lesson data:", err);
                setError(err instanceof Error ? err.message : 'Failed to load lesson details.');
                setLesson(null);
                setGoals([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLessonData();
    }, [lessonId]);

    const handleGoalsChange = useCallback((updatedGoals: Goal[]) => {
        setGoals(updatedGoals);
    }, [setGoals]);

    const handleSaveAndDefine = async () => {
        if (goals.length === 0) {
            alert("Please add at least one goal before saving.");
            return;
        }
        if (!lessonId || !lesson) return;

        const hasActiveGoal = goals.some(g => g.currentStatus?.status !== GoalStatusValue.ABANDONED);
        if (!hasActiveGoal) {
            alert("Cannot define lesson without at least one active (non-abandoned) goal.");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await updateLessonStatus(lessonId, LessonStatusTransition.DEFINE);
            navigate(-1);

        } catch (err) {
            console.error("Error saving lesson status:", err);
            setError(err instanceof Error ? err.message : 'Failed to save lesson status.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    const handleGoalAdded = (newGoal: Goal) => {
        setGoals(prevGoals => [...prevGoals, newGoal]);
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
    const isLessonDefined = lesson.currentStatus?.status === LessonStatusValue.DEFINED;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Lesson Details & Goals</h1>

            <TeacherLessonDetailCard lesson={lesson} />

            {studentId && lessonType && (
                <StudentObjectivesDisplay studentId={studentId} lessonType={lessonType} />
            )}

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-4">Manage Goals</h2>

            <AddGoalForm
                lessonId={lessonId}
                onGoalAdded={handleGoalAdded}
            />

            <GoalManager
                initialGoals={goals}
                lessonId={lessonId}
                onGoalsChange={handleGoalsChange}
            />

            <div className="flex justify-end space-x-4 mt-6">
                <Button onClick={handleCancel} variant="secondary" disabled={isSaving}>Cancel</Button>
                {!isLessonDefined && (
                    <Button onClick={handleSaveAndDefine}
                        disabled={isSaving || goals.length === 0 || goals.every(g => g.currentStatus?.status === GoalStatusValue.ABANDONED)}
                        variant="primary"
                    >
                        {isSaving ? 'Saving...' : 'Save and Define Lesson'}
                    </Button>
                )}
                {isSaving && error && <p className="text-red-500 text-sm mt-2">Error saving: {error}</p>}
            </div>
        </div>
    );
};

export default TeacherLessonDetailsPage; 