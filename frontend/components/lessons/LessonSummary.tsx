import React from 'react';
import { LessonSummary as SharedLessonSummary } from '@shared/models/LessonSummary.js';
import Card from '@frontend/components/shared/Card/Card';

interface LessonSummaryDisplayProps {
    summaryDetails: SharedLessonSummary;
}

const LessonSummaryDisplay: React.FC<LessonSummaryDisplayProps> = ({ summaryDetails }) => {
    if (!summaryDetails) {
        return null; // Or some placeholder if preferred when no summary exists
    }

    return (
        <Card title="Lesson Summary" variant="accent" className="my-6">
            <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-1">Summary:</h4>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {summaryDetails.summary || <span className="italic text-gray-500">No summary provided.</span>}
                </p>
            </div>

            <div>
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-1">Homework:</h4>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {summaryDetails.homework || <span className="italic text-gray-500">No homework assigned.</span>}
                </p>
            </div>
        </Card>
    );
};

export default LessonSummaryDisplay; 