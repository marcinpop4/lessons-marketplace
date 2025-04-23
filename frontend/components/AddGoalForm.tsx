import React, { useState, useEffect } from 'react';
import { Goal } from '@shared/models/Goal';
import { createGoal } from '@frontend/api/goalApi';
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';
import { GoalRecommendation } from '@shared/models/GoalRecommendation';

interface AddGoalFormProps {
    lessonId: string;
    onGoalAdded: (newGoal: Goal) => void; // Callback to notify parent when a goal is added
    // Add props for AI generation
    onGenerateRecommendations?: () => Promise<void>;
    isGeneratingRecommendations?: boolean;
    recommendationError?: string | null;
    // Add prop for pre-filling form from selected recommendation
    initialData?: { title: string; description: string; estimatedLessonCount: number | string } | null;
    // Add props for displaying recommendations
    recommendations?: GoalRecommendation[];
    onSelectRecommendation?: (recommendation: GoalRecommendation) => void;
    // Add props for placeholder logic
    desiredCount?: number;
    isStreaming?: boolean;
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
    onGenerateRecommendations,
    isGeneratingRecommendations = false, // Default to false
    recommendationError,
    initialData,
    recommendations = [], // Default to empty array
    onSelectRecommendation,
    desiredCount = 5, // Default desired count if not provided
    isStreaming = false
}) => {
    const [newGoalTitle, setNewGoalTitle] = useState<string>('');
    const [newGoalDescription, setNewGoalDescription] = useState<string>('');
    const [newGoalEstimate, setNewGoalEstimate] = useState<string>(''); // State for estimate (string for input)
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Effect to pre-fill form when initialData changes
    useEffect(() => {
        if (initialData) {
            setNewGoalTitle(initialData.title);
            setNewGoalDescription(initialData.description);
            // Ensure estimate is a string for the input field
            setNewGoalEstimate(String(initialData.estimatedLessonCount));
            setError(null); // Clear local form error when pre-filling
        }
        // Optionally, clear fields if initialData becomes null (e.g., deselecting)
        // else {
        //     setNewGoalTitle('');
        //     setNewGoalDescription('');
        //     setNewGoalEstimate('');
        // }
    }, [initialData]);

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
            setError('Goal title cannot be empty.');
            return;
        }
        if (!newGoalDescription.trim()) {
            setError('Goal description cannot be empty.');
            return;
        }
        // Validate and parse estimate
        const estimateNumber = parseInt(newGoalEstimate, 10);
        if (!newGoalEstimate || isNaN(estimateNumber) || estimateNumber <= 0) {
            setError('Please enter a valid positive number for estimated lessons.');
            return;
        }

        setIsAdding(true);
        setError(null);
        try {
            // Pass estimateNumber to the API call
            const newGoal = await createGoal(lessonId, newGoalTitle, newGoalDescription, estimateNumber);
            onGoalAdded(newGoal);
            setNewGoalTitle('');
            setNewGoalDescription('');
            setNewGoalEstimate(''); // Clear estimate input
            setError(null);
        } catch (err) {
            console.error("Error adding goal:", err);
            setError(err instanceof Error ? err.message : 'Failed to add goal.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleGenerateClick = () => {
        if (onGenerateRecommendations) {
            onGenerateRecommendations();
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
                    {onGenerateRecommendations && (
                        <Button
                            variant="accent"
                            onClick={handleGenerateClick}
                            disabled={isGeneratingRecommendations || isAdding}
                            className="whitespace-nowrap"
                            aria-label="Generate Goals with AI"
                        >
                            {isGeneratingRecommendations ? 'Generating...' : '✨ Generate Goals with AI'}
                        </Button>
                    )}
                    <Button
                        id="add-goal-button"
                        variant="primary"
                        onClick={handleAddGoal}
                        disabled={isAdding || !newGoalTitle.trim() || !newGoalDescription.trim() || !newGoalEstimate.trim()}
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
                                    ${initialData?.title === rec.title && initialData?.description === rec.description && initialData?.estimatedLessonCount == rec.estimatedLessonCount
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/[.3] dark:border-blue-700'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                                    }`}
                                onClick={() => onSelectRecommendation && onSelectRecommendation(rec)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? (onSelectRecommendation && onSelectRecommendation(rec)) : null}
                                aria-pressed={initialData?.title === rec.title}
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

            {error && <p className="text-sm text-red-500 mt-2" role="alert">Error adding goal: {error}</p>}
            {recommendationError && <p className="text-sm text-orange-500 mt-2" role="alert">AI Error: {recommendationError}</p>}
        </Card>
    );
};

export default AddGoalForm; 