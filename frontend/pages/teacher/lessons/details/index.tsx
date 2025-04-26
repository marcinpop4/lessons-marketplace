import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { Goal } from '@shared/models/Goal';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi';
import { getGoalsByLessonId, generateGoalRecommendations } from '@frontend/api/goalApi';
import { GoalRecommendation } from '@shared/models/GoalRecommendation';
import TeacherLessonDetailCard from '@frontend/components/TeacherLessonDetailCard';
import GoalManager from '@frontend/components/GoalManager';
import Button from '@frontend/components/shared/Button/Button';
import { GoalStatusValue } from '@shared/models/GoalStatus';
import AddGoalForm from '@frontend/components/AddGoalForm';

interface FormData {
    title: string;
    description: string;
    estimatedLessonCount: number;
}

// Define the desired recommendation count as a constant
const RECOMMENDATION_COUNT = 6; // Adjust this value as needed (backend caps at 10)

const TeacherLessonDetailsPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendationError, setRecommendationError] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<GoalRecommendation[]>([]);
    const [selectedRecommendationData, setSelectedRecommendationData] = useState<FormData | null>(null);
    const [isStreamingComplete, setIsStreamingComplete] = useState<boolean>(false);

    // Ref to hold the EventSource instance
    const eventSourceRef = useRef<EventSource | null>(null);

    // --- Effect for cleaning up EventSource on unmount ---
    useEffect(() => {
        // Return cleanup function
        return () => {
            if (eventSourceRef.current) {
                console.log('[SSE] Closing EventSource connection on component unmount.');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only on mount and unmount

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
        if (!lessonId || isGeneratingRecommendations) return; // Prevent multiple triggers

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setIsGeneratingRecommendations(true);
        setIsStreamingComplete(false); // Reset streaming complete status
        setRecommendationError(null);
        setRecommendations([]);
        setSelectedRecommendationData(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('[SSE] Auth token not found in localStorage.');
            setRecommendationError('Authentication error: Cannot generate recommendations.');
            setIsGeneratingRecommendations(false);
            return;
        }
        const url = `/api/v1/goals/recommendations/stream?lessonId=${lessonId}&count=${RECOMMENDATION_COUNT}&token=${encodeURIComponent(token)}`;
        console.log(`[SSE] Connecting to ${url}`);
        const newEventSource = new EventSource(url /* { withCredentials: true } */);
        eventSourceRef.current = newEventSource;

        newEventSource.addEventListener('recommendation', (event) => {
            try {
                console.log('[SSE] Received recommendation event:', event.data);
                const recommendation = JSON.parse(event.data) as GoalRecommendation; // Backend sends JSON
                // IMPORTANT: Instantiate the class if frontend needs its methods.
                // If just accessing properties, the parsed object might be sufficient.
                // const recommendationInstance = new GoalRecommendation(parsedData); // Use if needed

                setRecommendations((prev) => [...prev, recommendation]);
            } catch (error) {
                console.error('[SSE] Error parsing recommendation data:', error);
                // Optionally update UI to show parsing error
            }
        });

        newEventSource.addEventListener('end', (event) => {
            console.log('[SSE] Received end event:', event.data);
            setIsGeneratingRecommendations(false);
            setIsStreamingComplete(true); // Set streaming complete status
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
                console.log('[SSE] Connection closed by end event.');
            }
            try {
                const endData = JSON.parse(event.data);
                // Optionally display end message: `Stream finished: ${endData.count} recommendations.`
            } catch (e) { /* Ignore parsing error for end event */ }
        });

        newEventSource.addEventListener('error', (event) => {
            // This handles specific 'error' events sent by the server
            // AND general connection errors (where event.data might be undefined)
            console.error('[SSE] Received error event:', event);
            let errorMessage = 'An unknown error occurred during recommendation generation.';
            try {
                // Check if it's a custom error event from the server
                if ((event as MessageEvent).data) {
                    const errorData = JSON.parse((event as MessageEvent).data);
                    errorMessage = errorData.message || errorMessage;
                } else if (newEventSource.readyState === EventSource.CLOSED) {
                    // Check if the error is due to connection being closed
                    // Might happen if server restarts or network issue
                    errorMessage = 'Connection to server lost or closed unexpectedly.';
                    // Avoid setting error if it was closed intentionally by 'end' event shortly before
                    if (isGeneratingRecommendations) {
                        setRecommendationError(errorMessage);
                    }
                } else {
                    setRecommendationError(errorMessage);
                }
            } catch (e) {
                // Ignore parsing error for the error event itself
                setRecommendationError(errorMessage);
            }

            // Only set error if still in generating state (avoid race condition with 'end' event)
            if (isGeneratingRecommendations) {
                setRecommendationError(errorMessage);
            }
            setIsGeneratingRecommendations(false);
            setIsStreamingComplete(true); // Also mark as complete on error
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
                console.log('[SSE] Connection closed due to error event or network issue.');
            }
        });
    };

    const handleSelectRecommendation = (recommendation: GoalRecommendation) => {
        if (!recommendation) {
            console.error("handleSelectRecommendation called with invalid recommendation object:", recommendation);
            return;
        }
        setSelectedRecommendationData({
            title: recommendation.title,
            description: recommendation.description,
            estimatedLessonCount: recommendation.estimatedLessonCount
        });
    };

    const handleGoalAdded = (newGoal: Goal) => {
        setGoals(prevGoals => [...prevGoals, newGoal]);
        setSelectedRecommendationData(null);
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

    const isLessonDefined = lesson.currentStatus?.status === LessonStatusValue.DEFINED;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Lesson Details & Goals</h1>

            <TeacherLessonDetailCard lesson={lesson} />

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-4">Manage Goals</h2>

            <AddGoalForm
                lessonId={lessonId}
                onGoalAdded={handleGoalAdded}
                onGenerateRecommendations={handleGetRecommendations}
                isGeneratingRecommendations={isGeneratingRecommendations}
                recommendationError={recommendationError}
                initialData={selectedRecommendationData}
                recommendations={recommendations}
                onSelectRecommendation={handleSelectRecommendation}
                desiredCount={RECOMMENDATION_COUNT}
                isStreaming={isGeneratingRecommendations && !isStreamingComplete}
            />

            <GoalManager
                initialGoals={goals}
                lessonId={lessonId}
                onGoalsChange={handleGoalsChange}
            />

            <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                </Button>
                {!isLessonDefined && (
                    <Button
                        variant="primary"
                        onClick={handleSaveAndDefine}
                        disabled={!goals.some(g => g.currentStatus?.status !== GoalStatusValue.ABANDONED) || isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save and Define Lesson'}
                    </Button>
                )}
            </div>
            {error && isSaving && <p className="text-red-500 text-right mt-2">Save Error: {error}</p>}
        </div>
    );
};

export default TeacherLessonDetailsPage; 