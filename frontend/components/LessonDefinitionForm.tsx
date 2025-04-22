import React, { useState } from 'react';
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';

interface LessonDefinitionFormProps {
    onDefine: (title: string, description: string) => Promise<void>;
    onCancel: () => void;
}

const LessonDefinitionForm: React.FC<LessonDefinitionFormProps> = ({ onDefine, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Please provide a lesson title');
            return;
        }
        if (!description.trim()) {
            setError('Please provide a lesson description');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onDefine(title, description);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to define lesson');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card
            title="Define Lesson"
            variant="accent"
            className="lesson-definition-form"
            headingLevel="h3"
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="lesson-title" className="block text-sm font-medium mb-1">
                        Lesson Title
                    </label>
                    <input
                        id="lesson-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        placeholder="Enter lesson title..."
                        disabled={isSubmitting}
                        aria-label="Lesson Title"
                    />
                </div>

                <div>
                    <label htmlFor="lesson-description" className="block text-sm font-medium mb-1">
                        Lesson Description
                    </label>
                    <textarea
                        id="lesson-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        rows={4}
                        placeholder="Describe the lesson content and objectives..."
                        disabled={isSubmitting}
                        aria-label="Lesson Description"
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        aria-label="Cancel Lesson Definition"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || !description.trim()}
                        aria-label={isSubmitting ? 'Defining Lesson...' : 'Save Lesson'}
                    >
                        {isSubmitting ? 'Defining...' : 'Define Lesson'}
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

export default LessonDefinitionForm; 