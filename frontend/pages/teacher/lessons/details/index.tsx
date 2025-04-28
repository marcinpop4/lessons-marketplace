import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { Goal } from '@shared/models/Goal';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi';
import { getGoalsByLessonId } from '@frontend/api/goalApi'; // Removed generateGoalRecommendations as we use SSE
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
const RECOMMENDATION_COUNT = 6; // Keep for potential display logic

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

    const eventSourceRef = useRef<EventSource | null>(null);

    // --- Cleanup Effect --- 
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                console.log('[SSE] Closing EventSource on component unmount.');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

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

    const handleGetRecommendations = useCallback(async () => {
        if (!lessonId || isGeneratingRecommendations) return;

        // Close any existing connection before starting a new one
        if (eventSourceRef.current) {
            console.log('[SSE] Closing existing EventSource before starting new one.');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setIsGeneratingRecommendations(true);
        setIsStreamingComplete(false);
        setRecommendationError(null);
        setRecommendations([]); // Clear previous recommendations
        setSelectedRecommendationData(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('[SSE] Auth token not found in localStorage.');
            setRecommendationError('Authentication error: Cannot generate recommendations.');
            setIsGeneratingRecommendations(false);
            return;
        }

        const sseUrl = `/api/v1/goals/recommendations/stream?lessonId=${lessonId}&token=${encodeURIComponent(token)}`;

        try {
            const newEventSource = new EventSource(sseUrl);
            eventSourceRef.current = newEventSource;

            // Listener for recommendation data (server uses 'message' event type now)
            newEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[SSE] Received message event:", data);
                    // Assuming data is a single GoalRecommendation object per event
                    // If it needs class methods, instantiate: new GoalRecommendation(data)
                    setRecommendations((prev) => [...prev, data as GoalRecommendation]);
                } catch (e) {
                    console.error("[SSE] Error parsing message data:", event.data, e);
                    // Optionally update UI
                }
            };

            // Listener for explicit 'done' event from server
            newEventSource.addEventListener('done', (event) => {
                console.log("[SSE] Received done event:", event.data);
                setIsGeneratingRecommendations(false);
                setIsStreamingComplete(true);
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                    console.log('[SSE] Connection closed by done event.');
                }
                try {
                    // Optional: Parse and display the success message from the server
                    if (event.data) {
                        const doneData = JSON.parse(event.data);
                        console.log("Stream completion message:", doneData.message);
                    }
                } catch (e) { /* Ignore parsing error for done event message */ }
            });

            // Listener for explicit 'error' event from server
            newEventSource.addEventListener('error', (event) => {
                console.error('[SSE] Received error event:', event);
                let errorMessage = 'An error occurred during recommendation generation.'; // Default
                try {
                    // Check if event.data exists and is parseable
                    if ((event as MessageEvent).data) {
                        const errorData = JSON.parse((event as MessageEvent).data);
                        if (errorData?.message) {
                            errorMessage = errorData.message;
                        }
                        console.error('[SSE] Parsed server error event data:', errorData);
                    } else {
                        console.error("[SSE] Received error event with no data.");
                    }
                } catch (e) {
                    console.error('[SSE] Error parsing error event data:', (event as MessageEvent).data, e);
                    errorMessage = 'Received an invalid error message format from server.';
                }

                setRecommendationError(errorMessage);
                setIsGeneratingRecommendations(false);
                setIsStreamingComplete(true); // Mark as complete even on error
                if (eventSourceRef.current) {
                    eventSourceRef.current.close(); // Close connection
                    eventSourceRef.current = null;
                    console.log('[SSE] Connection closed by error event.');
                }
            });

            // Generic handler for connection errors (e.g., network issue)
            newEventSource.onerror = (event) => {
                // This catches network errors or if the server drops connection unexpectedly
                // Avoid duplicate actions if a specific 'error' or 'done' event already handled closure
                if (!eventSourceRef.current) {
                    console.log("[SSE] onerror called but connection already closed.");
                    return;
                }

                console.error('[SSE] Generic EventSource error (onerror):', event);
                setRecommendationError('Connection error or stream unexpectedly closed.');
                setIsGeneratingRecommendations(false);
                setIsStreamingComplete(true);

                eventSourceRef.current.close(); // Ensure closure
                eventSourceRef.current = null;
                console.log('[SSE] Connection closed by generic onerror handler.');
            };

        } catch (error) {
            console.error("[SSE] Failed to create EventSource:", error);
            setRecommendationError('Failed to establish connection for recommendations.');
            setIsGeneratingRecommendations(false);
        }

    }, [lessonId, isGeneratingRecommendations]); // Added dependencies

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