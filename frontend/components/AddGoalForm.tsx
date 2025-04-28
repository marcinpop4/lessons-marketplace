import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Goal } from '@shared/models/Goal';
import { createGoal } from '@frontend/api/goalApi';
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';
import { GoalRecommendation } from '@shared/models/GoalRecommendation';

interface AddGoalFormProps {
    lessonId: string;
    onGoalAdded: (newGoal: Goal) => void; // Callback to notify parent when a goal is added
    desiredCount?: number; // Keep this prop if needed for display
}

// Simple Placeholder Component
const PlaceholderCard: React.FC = () => (
    <div className="p-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
);

const AddGoalForm: React.FC<AddGoalFormProps> = ({
    lessonId,
    onGoalAdded,
    desiredCount = 6, // Default desired count
}) => {
    // Form input state
    const [newGoalTitle, setNewGoalTitle] = useState<string>('');
    const [newGoalDescription, setNewGoalDescription] = useState<string>('');
    const [newGoalEstimate, setNewGoalEstimate] = useState<string>('');
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null); // Renamed from error

    // AI Recommendation State (Moved from parent)
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [recommendations, setRecommendations] = useState<GoalRecommendation[]>([]);
    const [recommendationError, setRecommendationError] = useState<string | null>(null);
    const [selectedRecommendation, setSelectedRecommendation] = useState<GoalRecommendation | null>(null); // Internal selection state
    const [isStreaming, setIsStreaming] = useState<boolean>(false); // Combined generating/streaming state

    // Refs (Moved from parent)
    const eventSourceRef = useRef<EventSource | null>(null);
    const receivedAnyGoalRef = useRef<boolean>(false);

    // --- Cleanup Effect (Moved from parent) ---
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                console.log('[SSE AddGoalForm] Closing EventSource on component unmount.');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // Effect to pre-fill form when selectedRecommendation changes
    useEffect(() => {
        if (selectedRecommendation) {
            setNewGoalTitle(selectedRecommendation.title);
            setNewGoalDescription(selectedRecommendation.description);
            setNewGoalEstimate(String(selectedRecommendation.estimatedLessonCount));
            setFormError(null); // Clear local form error when pre-filling
        } else {
            // Optionally clear form if selection is cleared (or keep values?)
            // setNewGoalTitle('');
            // setNewGoalDescription('');
            // setNewGoalEstimate('');
        }
    }, [selectedRecommendation]);

    // --- AI Recommendation Logic (Moved from parent) ---
    const handleGenerateRecommendations = useCallback(async () => {
        if (!lessonId || isGenerating) return;

        if (eventSourceRef.current) {
            console.log('[SSE AddGoalForm] Closing existing EventSource before starting new one.');
            eventSourceRef.current.close();
        }

        setIsGenerating(true);
        setIsStreaming(true); // Start streaming indication
        setRecommendationError(null);
        setRecommendations([]);
        setSelectedRecommendation(null);
        receivedAnyGoalRef.current = false;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('[SSE AddGoalForm] Auth token not found.');
            setRecommendationError('Authentication error.');
            setIsGenerating(false);
            setIsStreaming(false);
            return;
        }

        const sseUrl = `/api/v1/goals/recommendations/stream?lessonId=${lessonId}&token=${encodeURIComponent(token)}`;

        try {
            const newEventSource = new EventSource(sseUrl);
            eventSourceRef.current = newEventSource;

            newEventSource.onmessage = (event) => {
                receivedAnyGoalRef.current = true;
                try {
                    const data = JSON.parse(event.data);
                    setRecommendations((prev) => [...prev, data as GoalRecommendation]);
                } catch (e) {
                    console.error("[SSE AddGoalForm] Error parsing message:", e);
                }
            };

            newEventSource.addEventListener('done', () => {
                console.log('[SSE AddGoalForm] Received done event.');
                setIsGenerating(false);
                setIsStreaming(false);
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }
            });

            newEventSource.addEventListener('error', (event) => {
                const alreadyReceived = receivedAnyGoalRef.current;

                console.error('[SSE AddGoalForm] Received explicit error event:', event);
                let msg = 'An error occurred during generation.';
                try {
                    if ((event as MessageEvent).data) {
                        const errorData = JSON.parse((event as MessageEvent).data);
                        msg = errorData?.message || msg;
                    }
                } catch (e) { /* Ignore parse error */ }

                // Only set user-facing error if no data was received
                if (!alreadyReceived) {
                    setRecommendationError(msg);
                } else {
                    console.log('[SSE AddGoalForm] Explicit error event received after data. Suppressing user message.');
                }

                // Cleanup regardless
                setIsGenerating(false);
                setIsStreaming(false);
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }
            });

            newEventSource.onerror = (event) => {
                const alreadyReceived = receivedAnyGoalRef.current;
                if (!eventSourceRef.current) return; // Already closed

                eventSourceRef.current.close();
                eventSourceRef.current = null;
                setIsGenerating(false);
                setIsStreaming(false);

                if (!alreadyReceived) {
                    console.error('[SSE AddGoalForm] Generic onerror before data:', event);
                    setRecommendationError('Connection error.');
                } else {
                    console.log('[SSE AddGoalForm] Generic onerror after data (ignoring).');
                }
            };

        } catch (error) {
            console.error("[SSE AddGoalForm] Failed to create EventSource:", error);
            setRecommendationError('Failed to connect.');
            setIsGenerating(false);
            setIsStreaming(false);
        }
    }, [lessonId, isGenerating]); // Dependencies

    // --- Form Handlers --- 
    const handleSelectRecommendation = (recommendation: GoalRecommendation | null) => {
        setSelectedRecommendation(recommendation);
    };

    // Helper to get badge color based on difficulty
    const getDifficultyBadgeClass = (level: string): string => {
        switch (level?.toLowerCase()) {
            case 'beginner':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'intermediate':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'advanced':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const handleAddGoal = async () => {
        if (!newGoalTitle.trim()) {
            setFormError('Goal title cannot be empty.');
            return;
        }
        if (!newGoalDescription.trim()) {
            setFormError('Goal description cannot be empty.');
            return;
        }
        // Validate and parse estimate
        const estimateNumber = parseInt(newGoalEstimate, 10);
        if (!newGoalEstimate || isNaN(estimateNumber) || estimateNumber <= 0) {
            setFormError('Please enter a valid positive number for estimated lessons.');
            return;
        }

        setIsAdding(true);
        setFormError(null);
        try {
            // Pass estimateNumber to the API call
            const newGoal = await createGoal(lessonId, newGoalTitle, newGoalDescription, estimateNumber);
            onGoalAdded(newGoal);
            setNewGoalTitle('');
            setNewGoalDescription('');
            setNewGoalEstimate(''); // Clear estimate input
            setSelectedRecommendation(null); // Deselect recommendation after adding
            setFormError(null);
        } catch (err) {
            console.error("Error adding goal:", err);
            setFormError(err instanceof Error ? err.message : 'Failed to add goal.');
        } finally {
            setIsAdding(false);
        }
    };

    // Calculate number of placeholders to show
    const receivedCount = recommendations.length;
    const placeholdersToShow = isStreaming ? Math.max(0, desiredCount - receivedCount) : 0;

    return (
        <Card
            title="Add New Goal"
            variant="accent"
            className="add-goal-card mb-6"
            headingLevel="h3"
        >
            <div className="space-y-3">
                <div>
                    <label htmlFor="goal-title" className="block text-sm font-medium mb-1">
                        Goal Title
                    </label>
                    <input
                        id="goal-title"
                        type="text"
                        placeholder="Enter goal title..."
                        value={newGoalTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoalTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        aria-label="Goal Title"
                    />
                </div>
                <div>
                    <label htmlFor="goal-description" className="block text-sm font-medium mb-1">
                        Goal Description
                    </label>
                    <textarea
                        id="goal-description"
                        placeholder="Enter goal description..."
                        value={newGoalDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewGoalDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        rows={3}
                        aria-label="Goal Description"
                    />
                </div>
                <div>
                    <label htmlFor="goal-estimate" className="block text-sm font-medium mb-1">
                        Lessons to Achieve
                    </label>
                    <input
                        id="goal-estimate"
                        type="number"
                        placeholder="Estimated lessons (e.g., 5)"
                        value={newGoalEstimate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoalEstimate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        min="1"
                        step="1"
                        aria-label="Lessons to Achieve"
                    />
                </div>
                <div className="flex flex-wrap justify-end items-center gap-3">
                    <Button
                        variant="accent"
                        onClick={handleGenerateRecommendations}
                        disabled={isGenerating || isAdding}
                        className="whitespace-nowrap"
                        aria-label="Generate Goals with AI"
                    >
                        {isGenerating ? 'Generating...' : '✨ Generate Goals with AI'}
                    </Button>
                    <Button
                        id="add-goal-button"
                        variant="primary"
                        onClick={handleAddGoal}
                        disabled={isAdding || !newGoalTitle.trim() || !newGoalDescription.trim() || !newGoalEstimate.trim() || isGenerating}
                        className="whitespace-nowrap"
                    >
                        {isAdding ? 'Adding...' : 'Add Goal'}
                    </Button>
                </div>
            </div>

            {/* Render recommendations and placeholders */}
            {(recommendations.length > 0 || isStreaming) && (
                <div className="mt-6 border-t pt-4 space-y-3">
                    <h4 className="text-base font-semibold text-gray-700 dark:text-gray-300">✨ AI Recommendations ({receivedCount}/{desiredCount})</h4>
                    {isStreaming && <p className="text-sm text-gray-600 dark:text-gray-400">Receiving recommendations... Select one to pre-fill the form.</p>}
                    {!isStreaming && recommendations.length > 0 && <p className="text-sm text-gray-600 dark:text-gray-400">Select a recommendation to pre-fill the form.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Render received recommendations */}
                        {recommendations.map((rec, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-md border cursor-pointer transition-all 
                                    ${selectedRecommendation === rec
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/[.3] dark:border-blue-700'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                                    }`}
                                onClick={() => handleSelectRecommendation(rec)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? (handleSelectRecommendation(rec)) : null}
                                aria-pressed={selectedRecommendation === rec}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mr-2">{rec.title}</h5>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyBadgeClass(rec.difficulty)}`}>
                                        {rec.difficulty || 'N/A'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{rec.description}</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Est. lessons: {rec.estimatedLessonCount}
                                </p>
                            </div>
                        ))}
                        {/* Render placeholders */}
                        {Array.from({ length: placeholdersToShow }).map((_, index) => (
                            <PlaceholderCard key={`placeholder-${index}`} />
                        ))}
                    </div>
                </div>
            )}

            {formError && <p className="text-sm text-red-500 mt-2" role="alert">Error adding goal: {formError}</p>}
            {recommendationError && <p className="text-sm text-orange-500 mt-2" role="alert">AI Error: {recommendationError}</p>}
        </Card>
    );
};

export default AddGoalForm; 