import React, { useState } from 'react';
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';

interface GoalCompletionFormProps {
    onComplete: (notes: string) => Promise<void>;
    onCancel: () => void;
}

const GoalCompletionForm: React.FC<GoalCompletionFormProps> = ({ onComplete, onCancel }) => {
    const [completionNotes, setCompletionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!completionNotes.trim()) {
            setError('Please provide completion notes');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onComplete(completionNotes);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete goal');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card
            title="Complete Goal"
            variant="accent"
            className="goal-completion-form"
            headingLevel="h3"
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="completion-notes" className="block text-sm font-medium mb-1">
                        Completion Notes
                    </label>
                    <textarea
                        id="completion-notes"
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        rows={4}
                        placeholder="Describe how the goal was achieved..."
                        disabled={isSubmitting}
                        aria-label="Completion Notes"
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        aria-label="Cancel Goal Completion"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !completionNotes.trim()}
                        aria-label={isSubmitting ? 'Completing Goal...' : 'Confirm Goal Completion'}
                    >
                        {isSubmitting ? 'Completing...' : 'Complete Goal'}
                    </Button>
                </div>

                {error && (
                    <p className="text-sm text-red-500" role="alert">
                        Error: {error}
                    </p>
                )}
            </div>
        </Card>
    );
};

export default GoalCompletionForm; 