import React, { useState, useEffect } from 'react';
import { Objective } from '@shared/models/Objective';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType'; // Import LessonType and formatter
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';
import { ObjectiveRecommendation } from '@shared/models/ObjectiveRecommendation'; // Import recommendation type

// Placeholder Component (Simplified)
const PlaceholderCard: React.FC = () => (
    <div className="p-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
);

interface AddObjectiveFormProps {
    onObjectiveAdded: () => void; // Callback to notify parent to refresh data
    // AI Props
    onGenerateRecommendations: (lessonType: LessonType | null) => Promise<void>; // Pass optional filter
    isGeneratingRecommendations: boolean;
    recommendationError: string | null;
    setRecommendationError: (error: string | null) => void; // ADDED: Callback to set error in parent
    initialData: ObjectiveRecommendation | null; // Use ObjectiveRecommendation type
    recommendations: ObjectiveRecommendation[];
    onSelectRecommendation: (recommendation: ObjectiveRecommendation | null) => void; // Allow null for deselection
    isStreaming: boolean;
}

const AddObjectiveForm: React.FC<AddObjectiveFormProps> = ({
    onObjectiveAdded,
    onGenerateRecommendations,
    isGeneratingRecommendations,
    recommendationError,
    setRecommendationError, // ADDED
    initialData,
    recommendations,
    onSelectRecommendation,
    isStreaming
}) => {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [lessonType, setLessonType] = useState<LessonType | ''>('');
    const [targetDate, setTargetDate] = useState<string>('');

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Effect to pre-fill form when initialData changes
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDescription(initialData.description);
            setLessonType(initialData.lessonType || ''); // Handle null lessonType
            setTargetDate(initialData.targetDate); // Date is already string YYYY-MM-DD
            setError(null); // Clear local form error when pre-filling
        } else {
            // Option: Clear form if initialData is null (recommendation deselected)
            // Uncomment if you want deselection to clear fields
            // setTitle('');
            // setDescription('');
            // setLessonType('');
            // setTargetDate('');
        }
    }, [initialData]);

    // Get today's date in YYYY-MM-DD format for min attribute on date input
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleAddObjective = async () => {
        // Basic Validation
        if (!title.trim()) {
            setError('Objective title cannot be empty.');
            return;
        }
        if (!description.trim()) {
            setError('Objective description cannot be empty.');
            return;
        }
        if (!lessonType) {
            setError('Please select a lesson type.');
            return;
        }
        if (!targetDate) {
            setError('Please select a target date.');
            return;
        }
        // Optional: Check if target date is in the past
        if (new Date(targetDate) < new Date(getTodayDateString())) {
            setError('Target date cannot be in the past.');
            return;
        }


        setIsAdding(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            // Backend expects these fields for objective creation
            const body = JSON.stringify({
                title,
                description,
                lessonType,
                targetDate // Send as string, backend service should handle parsing
            });

            const response = await fetch('/api/v1/objectives', {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: body,
            });

            if (!response.ok) {
                let errorMsg = `Failed to add objective: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            // Success
            onObjectiveAdded(); // Notify parent to refresh
            // Clear form
            setTitle('');
            setDescription('');
            setLessonType('');
            setTargetDate('');
            setError(null);
            onSelectRecommendation(null); // Deselect recommendation after successful add

        } catch (err: any) {
            console.error("Error adding objective:", err);
            setError(err.message || 'Failed to add objective.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleGenerateClick = () => {
        // --- ADDED VALIDATION --- 
        if (!lessonType) {
            setRecommendationError('Please select a Lesson Type to generate AI recommendations.');
            return; // Stop if no lesson type is selected
        }
        // --- END VALIDATION --- 

        // Clear previous error if validation passes
        setRecommendationError(null);
        // Proceed with generation using the selected lessonType
        onGenerateRecommendations(lessonType);
    };

    const handleRecommendationClick = (rec: ObjectiveRecommendation) => {
        // Toggle selection: if clicking the already selected one, deselect (set initialData to null)
        if (initialData?.title === rec.title && initialData?.description === rec.description) {
            onSelectRecommendation(null);
        } else {
            onSelectRecommendation(rec);
        }
    };

    // Calculate received count
    const receivedCount = recommendations.length;

    // Helper function to get badge styles based on difficulty
    const getDifficultyBadgeStyles = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): string => {
        switch (difficulty) {
            case 'Beginner':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Intermediate':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'Advanced':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    return (
        <Card
            title="Add New Objective"
            variant="accent" // Use accent variant like AddGoalForm
            className="add-objective-card mb-6" // Added margin bottom
            headingLevel="h3"
        >
            <div className="space-y-3">
                {/* Title Input */}
                <div>
                    <label htmlFor="objective-title" className="block text-sm font-medium mb-1">
                        Objective Title
                    </label>
                    <input
                        id="objective-title"
                        type="text"
                        placeholder="e.g., Master C Major Scale"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        aria-label="Objective Title"
                        required
                    />
                </div>

                {/* Description Textarea */}
                <div>
                    <label htmlFor="objective-description" className="block text-sm font-medium mb-1">
                        Description
                    </label>
                    <textarea
                        id="objective-description"
                        placeholder="Describe the objective..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        rows={3}
                        aria-label="Objective Description"
                        required
                    />
                </div>

                {/* Lesson Type Select */}
                <div>
                    <label htmlFor="objective-lesson-type" className="block text-sm font-medium mb-1">
                        Lesson Type
                    </label>
                    <select
                        id="objective-lesson-type"
                        value={lessonType}
                        onChange={(e) => setLessonType(e.target.value as LessonType)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding || isGeneratingRecommendations}
                        aria-label="Lesson Type"
                        required
                    >
                        <option value="" disabled>Select Lesson Type...</option>
                        {Object.values(LessonType).map((type) => (
                            <option key={type} value={type}>
                                {formatDisplayLabel(type)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Date Input */}
                <div>
                    <label htmlFor="objective-target-date" className="block text-sm font-medium mb-1">
                        Target Date
                    </label>
                    <input
                        id="objective-target-date"
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        min={getTodayDateString()} // Prevent selecting past dates
                        aria-label="Target Date"
                        required
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end items-center gap-3 pt-2">
                    <Button
                        variant="accent"
                        onClick={handleGenerateClick}
                        disabled={isGeneratingRecommendations || isAdding}
                        className="whitespace-nowrap"
                        aria-label="Generate Objectives with AI"
                    >
                        {isGeneratingRecommendations ? 'Generating...' : '✨ Generate Objectives with AI'}
                    </Button>
                    <Button
                        id="add-objective-button"
                        variant="primary"
                        onClick={handleAddObjective}
                        disabled={isAdding || !title.trim() || !description.trim() || !lessonType || !targetDate}
                    >
                        {isAdding ? 'Adding...' : 'Add Objective'}
                    </Button>
                </div>
            </div>

            {/* Render recommendations and placeholders */}
            {(recommendations.length > 0 || isStreaming) && (
                <div className="mt-6 border-t pt-4 space-y-3 dark:border-gray-700">
                    <h4 className="text-base font-semibold text-gray-700 dark:text-gray-300">✨ AI Recommendations ({receivedCount})</h4>
                    {isStreaming && <p className="text-sm text-gray-600 dark:text-gray-400">Receiving recommendations... Select one to pre-fill the form.</p>}
                    {!isStreaming && recommendations.length > 0 && <p className="text-sm text-gray-600 dark:text-gray-400">Select a recommendation to pre-fill the form.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recommendations.map((rec, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-md border cursor-pointer transition-all 
                                    ${initialData?.title === rec.title && initialData?.description === rec.description
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/[.3] dark:border-blue-700'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                                    }`}
                                onClick={() => handleRecommendationClick(rec)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleRecommendationClick(rec) : null}
                                aria-pressed={initialData?.title === rec.title}
                            >
                                <div className="flex justify-between items-start mb-1"> {/* Flex container for title and badge */}
                                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mr-2">{rec.title}</h5>
                                    {/* Difficulty Badge */}
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getDifficultyBadgeStyles(rec.difficulty)}`}>
                                        {rec.difficulty}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{rec.description}</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Target: {rec.targetDate} {rec.lessonType ? `(${formatDisplayLabel(rec.lessonType)})` : ''}
                                </p>
                            </div>
                        ))}
                        {/* Render placeholders while streaming if needed */}
                        {isStreaming && recommendations.length < 6 &&
                            Array.from({ length: 6 - recommendations.length }).map((_, i) => <PlaceholderCard key={`placeholder-${i}`} />)
                        }
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && <p className="text-sm text-red-500 mt-2" role="alert">Error: {error}</p>}
            {recommendationError && <p className="text-sm text-orange-500 mt-2" role="alert">AI Error: {recommendationError}</p>}
        </Card>
    );
};

export default AddObjectiveForm; 