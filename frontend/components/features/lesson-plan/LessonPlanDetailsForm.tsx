import React from 'react';
import { Card } from '@frontend/components/shared/Card';

interface LessonPlanDetailsFormProps {
    title: string;
    onTitleChange: (title: string) => void;
    description: string;
    onDescriptionChange: (description: string) => void;
    dueDate: string;
    onDueDateChange: (date: string) => void;
}

const LessonPlanDetailsForm: React.FC<LessonPlanDetailsFormProps> = ({
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    dueDate,
    onDueDateChange,
}) => {
    return (
        <Card title="Lesson Plan Details" headingLevel="h2">
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label htmlFor="lessonPlanTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                        type="text"
                        id="lessonPlanTitle"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        placeholder="e.g., Introduction to Piano"
                    />
                </div>
                <div>
                    <label htmlFor="lessonPlanDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                        id="lessonPlanDescription"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        placeholder="e.g., Covering basic scales, chords, and sight-reading."
                    />
                </div>
                <div>
                    <label htmlFor="lessonPlanDueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Overall Due Date (Optional)</label>
                    <input
                        type="date"
                        id="lessonPlanDueDate"
                        value={dueDate}
                        onChange={(e) => onDueDateChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    />
                </div>
            </div>
        </Card>
    );
};

export default LessonPlanDetailsForm; 