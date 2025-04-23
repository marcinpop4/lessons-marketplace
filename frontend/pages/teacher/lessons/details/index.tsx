import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { Goal } from '@shared/models/Goal';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi';
import { getGoalsByLessonId, generateGoalRecommendations } from '@frontend/api/goalApi';
import TeacherLessonDetailCard from '@frontend/components/TeacherLessonDetailCard';
import GoalManager from '@frontend/components/GoalManager';
import Button from '@frontend/components/shared/Button/Button';
import { GoalStatusValue } from '@shared/models/GoalStatus';

interface GoalRecommendation {
    goal: {
        title: string;
        description: string;
        numberOfLessons: number;
    };
}

interface FormData {
    title: string;
    description: string;
    estimatedLessonCount: number;
}

const TeacherLessonDetailsPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<GoalRecommendation[]>([]);
    const [selectedGoal, setSelectedGoal] = useState<GoalRecommendation | null>(null);
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        estimatedLessonCount: 1
    });

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

    const handleGetRecommendations = async () => {
        if (!lesson || !lessonId) return;

        setIsLoading(true);
        try {
            const recommendations = await generateGoalRecommendations(lessonId);
            setRecommendations(recommendations);
        } catch (error) {
            console.error('Error getting recommendations:', error);
            setError(error instanceof Error ? error.message : 'Failed to get recommendations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRecommendation = (recommendation: GoalRecommendation) => {
        setSelectedGoal(recommendation);
        setFormData({
            title: recommendation.goal.title,
            description: recommendation.goal.description,
            estimatedLessonCount: recommendation.goal.numberOfLessons
        });
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

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Lesson Details & Goals</h1>

            <TeacherLessonDetailCard lesson={lesson} />

            <GoalManager
                initialGoals={goals}
                lessonId={lessonId}
                onGoalsChange={handleGoalsChange}
            />

            <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSaveAndDefine}
                    disabled={!goals.some(g => g.currentStatus?.status !== GoalStatusValue.ABANDONED) || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save and Define Lesson'}
                </Button>
            </div>
            {error && isSaving && <p className="text-red-500 text-right mt-2">Save Error: {error}</p>}

            <div className="mt-4">
                <Button
                    onClick={handleGetRecommendations}
                    disabled={isLoading}
                    variant="secondary"
                >
                    {isLoading ? (
                        <>
                            Getting AI Recommendations...
                        </>
                    ) : (
                        'Get AI Recommendations'
                    )}
                </Button>
            </div>

            {recommendations.length > 0 && (
                <div className="mt-4 space-y-4">
                    <h3 className="text-lg font-semibold">AI Recommendations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendations.map((rec, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedGoal === rec
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                onClick={() => handleSelectRecommendation(rec)}
                            >
                                <h4 className="font-medium text-gray-900">{rec.goal.title}</h4>
                                <p className="mt-2 text-sm text-gray-600">{rec.goal.description}</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    Estimated lessons: {rec.goal.numberOfLessons}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherLessonDetailsPage; 