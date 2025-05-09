import React from 'react';
// Assuming UIMilestone and UIPlannedLesson will be imported from a path relative to this file
// For example, if they are in the same directory or a types file:
import { UIMilestone, UIPlannedLesson } from './MilestoneForm'; // Adjust if types are elsewhere

interface LessonPlanSummaryProps {
    objectiveTitle: string;
    objectiveDescription: string;
    objectiveDueDate: string;
    milestones: UIMilestone[];
}

const LessonPlanSummary: React.FC<LessonPlanSummaryProps> = ({
    objectiveTitle,
    objectiveDescription,
    objectiveDueDate,
    milestones,
}) => {
    return (
        <div className="p-4 border rounded-lg shadow bg-gray-50 h-full sticky top-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Lesson Plan Summary</h2>

            {/* Objective Section */}
            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-600 mb-1">Objective</h3>
                {objectiveTitle && <p className="text-md font-semibold text-gray-800">{objectiveTitle}</p>}
                {objectiveDescription && <p className="text-sm text-gray-600 mt-1">{objectiveDescription}</p>}
                {objectiveDueDate && <p className="text-xs text-gray-500 mt-1">Due: {objectiveDueDate}</p>}
                {(!objectiveTitle && !objectiveDescription && !objectiveDueDate) && <p className="text-sm text-gray-400 italic">No objective details yet.</p>}
            </div>

            {/* Milestones Section */}
            {milestones.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Milestones</h3>
                    <ul className="space-y-4">
                        {milestones.map((milestone, mIndex) => (
                            <li key={milestone.id || mIndex} className="pl-4 border-l-2 border-blue-300">
                                <p className="text-md font-semibold text-blue-700">{milestone.title || `Milestone ${mIndex + 1}`}</p>
                                {milestone.description && <p className="text-sm text-gray-600 mt-0.5">{milestone.description}</p>}
                                {milestone.dueDate && <p className="text-xs text-gray-500 mt-0.5">Due: {milestone.dueDate}</p>}

                                {/* Planned Lessons within Milestone */}
                                {milestone.lessons.length > 0 && (
                                    <div className="mt-2 pl-4">
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Planned Lessons:</h4>
                                        <ul className="space-y-1 list-disc list-inside">
                                            {milestone.lessons.map((lesson, lIndex) => (
                                                <li key={lesson.id || lIndex} className="text-xs text-gray-600">
                                                    {lesson.selectedDate || 'Date TBD'} at {lesson.selectedTime || 'Time TBD'}
                                                    {lesson.durationMinutes > 0 && ` (${lesson.durationMinutes} min)`}
                                                    {(!lesson.selectedDate && !lesson.selectedTime && !lesson.durationMinutes) && <span className="italic text-gray-400">Lesson details TBD</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {milestone.lessons.length === 0 && <p className="text-xs text-gray-400 italic mt-1 pl-4">No planned lessons for this milestone yet.</p>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {milestones.length === 0 && <p className="text-sm text-gray-400 italic">No milestones added yet.</p>}
        </div>
    );
};

export default LessonPlanSummary; 