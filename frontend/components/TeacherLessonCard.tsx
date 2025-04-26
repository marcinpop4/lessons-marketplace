import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// Import shared models
import { Lesson } from '@shared/models/Lesson';
// Import necessary enums and the class for static methods
import { LessonStatusValue, LessonStatusTransition, LessonStatus } from '@shared/models/LessonStatus';
import Card from '@frontend/components/shared/Card/Card'; // Import shared Card
import Button from '@frontend/components/shared/Button/Button'; // Import shared Button
// Removed unused import: import { updateLessonStatus } from '@frontend/api/lessonApi';

// Define props for the Notes Modal (can be moved to a separate Modal component later)
interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (notes: string) => void;
    lessonTitle: string;
}

// Simple Modal Component (inline for now)
const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, onConfirm, lessonTitle }) => {
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(notes);
        setNotes(''); // Clear notes after confirm
    };

    const handleClose = () => {
        onClose();
        setNotes(''); // Clear notes on close
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Complete Lesson: {lessonTitle}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Please enter completion notes:</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                    placeholder="e.g., Student mastered the scales, needs practice on timing..."
                />
                <div className="mt-5 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirm}>Confirm Completion</Button>
                </div>
            </div>
        </div>
    );
};

interface TeacherLessonCardProps {
    lesson: Lesson; // Use actual Lesson type
    currentStatus: LessonStatusValue; // Pass current status explicitly
    goalCount: number; // Added goal count prop
    onUpdateStatus: (lessonId: string, currentStatus: LessonStatusValue, transition: LessonStatusTransition) => void;
    isUpdating: boolean; // Use loading state from parent
}

const TeacherLessonCard: React.FC<TeacherLessonCardProps> = ({
    lesson,
    currentStatus,
    goalCount, // Destructure goalCount
    onUpdateStatus,
    isUpdating
}) => {
    const navigate = useNavigate();

    // --- New Logic ---
    const student = lesson.quote.lessonRequest.student; // Access student details
    const request = lesson.quote.lessonRequest; // Access request details

    // Get the map of possible transitions for the current status
    const possibleTransitionsMap = LessonStatus.StatusTransitions[currentStatus] || {};
    // Extract the transition names (keys) from the map
    const availableTransitions = (Object.keys(possibleTransitionsMap) as LessonStatusTransition[])
        // Filter out the DEFINE transition, we'll handle it separately
        .filter(t => t !== LessonStatusTransition.DEFINE);

    // Helper to format transition enum keys (e.g., ACCEPT -> Accept)
    const formatTransition = (transition: LessonStatusTransition): string => {
        // Use the centralized utility function from the model
        return LessonStatus.getDisplayLabelForTransition(transition); // Use new function
    };
    // --- End New Logic ---

    // Function to determine button variant based on transition
    const getButtonVariant = (transition: LessonStatusTransition): 'primary' | 'secondary' => {
        switch (transition) {
            case LessonStatusTransition.ACCEPT:
            case LessonStatusTransition.COMPLETE: // COMPLETE uses primary
            case LessonStatusTransition.DEFINE: // Define uses primary
                return 'primary';
            case LessonStatusTransition.REJECT:
            case LessonStatusTransition.VOID:
                return 'secondary';
            default:
                return 'primary'; // Default to primary
        }
    };

    // Function to handle button click - Reverted logic
    const handleButtonClick = (transition: LessonStatusTransition) => {

        if (transition === LessonStatusTransition.DEFINE) {
            navigate(`/teacher/lessons/${lesson.id}`);
        } else {
            onUpdateStatus(lesson.id, currentStatus, transition);
        }
    };

    // Function to specifically handle navigation for managing goals
    const handleManageGoalsClick = () => {
        navigate(`/teacher/lessons/${lesson.id}`);
    };

    // Check if goal management should be enabled
    const canManageGoals = currentStatus === LessonStatusValue.ACCEPTED ||
        currentStatus === LessonStatusValue.DEFINED ||
        currentStatus === LessonStatusValue.COMPLETED; // Add COMPLETED status

    // Use original studentName logic if needed for title
    const studentName = `${student?.firstName || 'N/A'} ${student?.lastName || ''}`;
    const lessonTitle = `Lesson with ${studentName}`; // Keep for title

    return (
        <Card
            title={lessonTitle}
            className="mb-4"
            headingLevel="h4"
        >
            {/* Refactored body content using simple <p> tags */}
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Start Time:</span>
                {request?.startTime ? new Date(request.startTime).toLocaleString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Duration:</span>
                {request?.durationMinutes || 'N/A'} minutes
            </p>
            {/* Add Lesson Type */}
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Type:</span>
                {lesson.quote.lessonRequest.type || 'N/A'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Address:</span>
                {request?.address?.toString() || 'N/A'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Cost:</span>
                {lesson.quote?.getFormattedCost() || 'N/A'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold mr-1">Status:</span>
                {LessonStatus.getDisplayLabelForStatus(currentStatus)}
            </p>
            {/* Conditionally display goal count below status */}
            {canManageGoals && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold mr-1">Goals:</span>
                    {goalCount}
                </p>
            )}

            {/* Updated Action Buttons based on transitions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2 flex-wrap gap-y-2">
                {isUpdating ? (
                    <Button variant="secondary" size="sm" disabled>
                        Updating...
                    </Button>
                ) : (
                    <>
                        {/* Render standard transition buttons */}
                        {availableTransitions.map(transition => (
                            <Button
                                key={transition}
                                onClick={() => handleButtonClick(transition)} // Uses reverted handler
                                variant={getButtonVariant(transition)}
                                size="sm"
                                disabled={isUpdating}
                            >
                                {formatTransition(transition)}
                            </Button>
                        ))}

                        {/* Render Manage Goals button conditionally with goal count */}
                        {canManageGoals && (
                            <Button
                                key="manage-goals"
                                onClick={handleManageGoalsClick}
                                variant="accent" // Change variant to accent
                                size="sm"
                                disabled={isUpdating}
                            >
                                Manage Goals
                            </Button>
                        )}

                        {/* Handle case where no actions are available at all */}
                        {availableTransitions.length === 0 && !canManageGoals && (
                            <span className="text-sm text-gray-500 italic">No actions available</span>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};

export default TeacherLessonCard; 