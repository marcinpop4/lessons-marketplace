import React, { useState } from 'react';
import { Objective } from '@shared/models/Objective';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType'; // Import LessonType and formatter
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';

interface AddObjectiveFormProps {
    onObjectiveAdded: () => void; // Callback to notify parent to refresh data
}

const AddObjectiveForm: React.FC<AddObjectiveFormProps> = ({ onObjectiveAdded }) => {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [lessonType, setLessonType] = useState<LessonType | ''>(''); // Use LessonType enum, empty string for initial
    const [targetDate, setTargetDate] = useState<string>(''); // Store as string for date input

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

        } catch (err: any) {
            console.error("Error adding objective:", err);
            setError(err.message || 'Failed to add objective.');
        } finally {
            setIsAdding(false);
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
                        disabled={isAdding}
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

                {/* Submit Button */}
                <div className="flex justify-end items-center pt-2">
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

            {/* Error Display */}
            {error && <p className="text-sm text-red-500 mt-2" role="alert">Error: {error}</p>}
        </Card>
    );
};

export default AddObjectiveForm; 