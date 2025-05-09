import React from 'react';
import Button from '@frontend/components/shared/Button/Button'; // Import Button
// Import LessonDetailsForm and related types
import LessonDetailsForm from '../../features/lesson-request/LessonDetailsForm';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';

// Updated interface for planned lessons
export interface UIPlannedLesson {
    id: string;
    selectedDate: string; // YYYY-MM-DD
    selectedTime: string; // HH:MM
    durationMinutes: number; // Store as number
}

// Define an interface for the local state of a milestone in the UI
// This might differ slightly from the shared/models/Milestone.ts if UI needs temporary fields
export interface UIMilestone {
    id: string; // Can be a temporary client-side ID for new milestones
    title: string;
    description: string;
    dueDate: string; // Store as string for input type='date'
    lessons: UIPlannedLesson[]; // Use renamed interface
}

interface MilestoneFormProps {
    milestone: UIMilestone;
    index: number; // To display "Milestone X"
    lessonType: LessonType; // Receive lessonType from parent
    onMilestoneChange: (milestoneId: string, field: keyof UIMilestone, value: any) => void;
    onRemoveMilestone?: (milestoneId: string) => void; // Optional: if removal is handled per milestone
    // Handlers for planned lessons within the milestone
    onAddPlannedLesson: (milestoneId: string) => void;
    onPlannedLessonChange: (milestoneId: string, plannedLessonId: string, field: keyof UIPlannedLesson, value: string | number) => void; // value can be string or number
    onRemovePlannedLesson: (milestoneId: string, plannedLessonId: string) => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({
    milestone,
    index,
    lessonType, // Destructure lessonType
    onMilestoneChange,
    onRemoveMilestone,
    onAddPlannedLesson,
    onPlannedLessonChange,
    onRemovePlannedLesson
}) => {
    const handleInputChange = (field: keyof Omit<UIMilestone, 'id' | 'lessons'>, value: string) => {
        onMilestoneChange(milestone.id, field, value);
    };

    // Handler for changes within LessonDetailsForm
    const handlePlannedLessonDetailsChange = (plannedLessonId: string, field: keyof UIPlannedLesson, value: string | number) => {
        // Convert duration to number if needed
        const processedValue = (field === 'durationMinutes' && typeof value === 'string') ? parseInt(value, 10) || 0 : value;
        onPlannedLessonChange(milestone.id, plannedLessonId, field, processedValue);
    };

    return (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg dark:text-gray-200">Milestone {index + 1}: {milestone.title || 'New Milestone'}</h3>
                {onRemoveMilestone && (
                    <Button
                        variant='secondary' // Use a defined variant
                        size='sm'
                        onClick={() => onRemoveMilestone(milestone.id)}
                        className="text-red-500 hover:text-red-700"
                    >
                        Remove Milestone
                    </Button>
                )}
            </div>

            <div>
                <label htmlFor={`milestoneTitle-${milestone.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                    type="text"
                    id={`milestoneTitle-${milestone.id}`}
                    value={milestone.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="e.g., Week 1: Basic Chords"
                />
            </div>
            <div>
                <label htmlFor={`milestoneDescription-${milestone.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                    id={`milestoneDescription-${milestone.id}`}
                    value={milestone.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="e.g., Learn C, G, D major chords and practice transitioning between them."
                />
            </div>
            <div>
                <label htmlFor={`milestoneDueDate-${milestone.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                <input
                    type="date"
                    id={`milestoneDueDate-${milestone.id}`}
                    value={milestone.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
            </div>

            {/* Planned Lessons using LessonDetailsForm */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <h4 className="font-medium text-md mb-2 dark:text-gray-200">Planned Lessons for this Milestone</h4>
                {milestone.lessons.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No planned lessons added for this milestone.</p>
                )}
                {milestone.lessons.map((plannedLesson, lessonIndex) => (
                    <div key={`${plannedLesson.id}-${plannedLesson.selectedTime}`} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-sm font-medium dark:text-gray-300">Lesson {lessonIndex + 1}</p>
                            <Button
                                variant='secondary'
                                size='sm'
                                onClick={() => onRemovePlannedLesson(milestone.id, plannedLesson.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                Remove Lesson
                            </Button>
                        </div>
                        <LessonDetailsForm
                            key={`lesson-form-${plannedLesson.id}-${plannedLesson.selectedTime}`}
                            type={lessonType}
                            durationMinutes={plannedLesson.durationMinutes}
                            selectedDate={plannedLesson.selectedDate}
                            selectedTime={plannedLesson.selectedTime}
                            onTypeChange={() => { }}
                            onDurationChange={(e) => handlePlannedLessonDetailsChange(plannedLesson.id, 'durationMinutes', e.target.value)}
                            onDateChange={(e) => handlePlannedLessonDetailsChange(plannedLesson.id, 'selectedDate', e.target.value)}
                            onTimeChange={(e) => handlePlannedLessonDetailsChange(plannedLesson.id, 'selectedTime', e.target.value)}
                            disableType={true}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">Lesson Type: {formatDisplayLabel(lessonType)} (fixed)</p>
                    </div>
                ))}
                <div className="mt-2">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAddPlannedLesson(milestone.id)}
                    >
                        Add Planned Lesson
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MilestoneForm; 