import React, { useState } from 'react';
import { Goal } from '@shared/models/Goal';
import { createGoal } from '@frontend/api/goalApi';
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';

interface AddGoalFormProps {
    lessonId: string;
    onGoalAdded: (newGoal: Goal) => void; // Callback to notify parent when a goal is added
    // We could pass down isAdding state from parent if needed, but for simplicity,
    // let's keep the adding state local to the form for now.
}

const AddGoalForm: React.FC<AddGoalFormProps> = ({ lessonId, onGoalAdded }) => {
    const [newGoalTitle, setNewGoalTitle] = useState<string>('');
    const [newGoalDescription, setNewGoalDescription] = useState<string>('');
    const [newGoalEstimate, setNewGoalEstimate] = useState<string>(''); // State for estimate (string for input)
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <Card
            title="Add New Goal"
            variant="accent"
            className="add-goal-card mb-6"
            headingLevel="h3"
        >
            <div className="space-y-3">
                <input
                    type="text"
                    placeholder="Enter goal title..."
                    value={newGoalTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoalTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                    disabled={isAdding}
                />
                <textarea
                    placeholder="Enter goal description..."
                    value={newGoalDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewGoalDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                    disabled={isAdding}
                    rows={3}
                />
                {/* Estimated Lessons Input */}
                <input
                    type="number"
                    placeholder="Estimated lessons (e.g., 5)"
                    value={newGoalEstimate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoalEstimate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                    disabled={isAdding}
                    min="1" // Basic HTML5 validation
                    step="1"
                />
                <div className="flex justify-end">
                    <Button
                        variant="primary"
                        onClick={handleAddGoal}
                        disabled={isAdding || !newGoalTitle.trim() || !newGoalDescription.trim() || !newGoalEstimate.trim()}
                        className="whitespace-nowrap"
                    >
                        {isAdding ? 'Adding...' : 'Add Goal'}
                    </Button>
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-2">Error: {error}</p>}
        </Card>
    );
};

export default AddGoalForm; 