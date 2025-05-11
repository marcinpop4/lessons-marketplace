import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Link might be removable if Card handles it all
// Import shared models
import { Lesson } from '@shared/models/Lesson';
// Import necessary enums and the class for static methods
import { LessonStatusValue, LessonStatusTransition, LessonStatus } from '@shared/models/LessonStatus';
import Card from '@frontend/components/shared/Card/Card'; // Import shared Card
import Button from '@frontend/components/shared/Button/Button'; // Import shared Button
import { formatDisplayLabel } from '@shared/models/LessonType'; // <-- Import added
import { UserType } from '@shared/models/UserType';
// Removed: import { LessonSummaryModal } from './LessonSummaryModal'; // Corrected import path
// Removed unused import: import { updateLessonStatus } from '@frontend/api/lessonApi';

// --- New: Lesson Summary Modal ---
interface LessonSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (summary: string, homework: string) => void;
    lessonTitle: string;
    error?: string | null; // <-- New error prop
}

const LessonSummaryModal: React.FC<LessonSummaryModalProps> = ({ isOpen, onClose, onConfirm, lessonTitle, error }) => {
    const [summary, setSummary] = useState('');
    const [homework, setHomework] = useState('');

    // Clear summary and homework when modal is opened/closed or error changes
    useEffect(() => {
        if (isOpen) {
            // Optionally, clear fields when modal opens, or decide if you want to persist them during an error
        } else {
            setSummary('');
            setHomework('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirmClick = () => {
        onConfirm(summary, homework);
        // Don't clear fields here immediately if there might be an error shown
        // Clearing will be handled by onClose or if confirm is successful in parent
    };

    const handleCloseClick = () => {
        onClose(); // This will also trigger error clearing in parent if setup that way
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Summary for: {lessonTitle}</h2>
                {/* Display error message if present */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-300" role="alert">
                        <p className="text-sm font-medium">Error:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="lesson-summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Lesson Summary
                        </label>
                        <textarea
                            id="lesson-summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                            placeholder="e.g., Key topics covered, student's progress, areas of difficulty..."
                        />
                    </div>
                    <div>
                        <label htmlFor="lesson-homework" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Homework / Next Steps
                        </label>
                        <textarea
                            id="lesson-homework"
                            value={homework}
                            onChange={(e) => setHomework(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                            placeholder="e.g., Practice exercises, topics for next lesson..."
                        />
                    </div>
                </div>
                <div className="mt-5 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleCloseClick}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirmClick}>Save Summary</Button>
                </div>
            </div>
        </div>
    );
};
// --- End New: Lesson Summary Modal ---

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

export interface TeacherLessonCardProps {
    lesson: Lesson;
    onCancel: (lessonId: string) => void;
    onOpenSummaryModal: (lessonId: string, lessonTitle: string) => void;
    currentUser?: { id: string; userType: UserType } | null;
    onUpdateStatus: (lessonId: string, currentStatus: LessonStatusValue, transition: LessonStatusTransition) => void;
    isUpdating: boolean;
}

export const TeacherLessonCard: React.FC<TeacherLessonCardProps> = ({
    lesson,
    onCancel,
    onOpenSummaryModal,
    currentUser,
    onUpdateStatus,
    isUpdating,
}) => {
    const navigate = useNavigate();
    const isTeacher = currentUser?.userType === UserType.TEACHER;
    const canCancel = isTeacher && lesson.currentStatus?.status === LessonStatusValue.ACCEPTED;

    // --- New Logic ---
    const student = lesson.quote.lessonRequest.student; // Access student details
    const request = lesson.quote.lessonRequest; // Access request details

    // Get the map of possible transitions for the current status
    const currentLessonStatus = lesson.currentStatus?.status;
    const possibleTransitionsMap = currentLessonStatus ? LessonStatus.StatusTransitions[currentLessonStatus] || {} : {};
    // Extract the transition names (keys) from the map
    const availableTransitions = (Object.keys(possibleTransitionsMap) as LessonStatusTransition[])

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
                return 'primary';
            case LessonStatusTransition.REJECT:
            case LessonStatusTransition.VOID:
                return 'secondary';
            default:
                return 'primary'; // Default to primary
        }
    };

    // Function to handle button click
    const handleTransitionButtonClick = (transition: LessonStatusTransition) => {
        if (currentLessonStatus && !isUpdating) {
            onUpdateStatus(lesson.id, currentLessonStatus, transition);
        }
    };

    // Use original studentName logic if needed for title
    const studentName = `${student?.firstName || 'N/A'} ${student?.lastName || ''}`;
    const lessonTitle = `Lesson with ${studentName}`; // Keep for title

    return (
        <Card
            title={lessonTitle} // Use Card's title prop again
            className="mb-4 lesson-card"
            headingLevel="h2"
            titleLinkTo={`/teacher/lessons/${lesson.id}`} // Use the new prop
        >
            {/* Removed Custom Linked Title div */}

            <div className="card-body space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Start Time:</span>
                    {request?.startTime ? new Date(request.startTime).toLocaleString() : 'N/A'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Duration:</span>
                    {request?.durationMinutes || 'N/A'} minutes
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Type:</span>
                    {lesson.quote.lessonRequest.type ? formatDisplayLabel(lesson.quote.lessonRequest.type) : 'N/A'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Address:</span>
                    {request?.address?.toString() || 'N/A'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Cost:</span>
                    {lesson.quote?.getFormattedCost() || 'N/A'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                    <span className="font-semibold mr-1">Status:</span>
                    {lesson.currentStatus?.status ? LessonStatus.getDisplayLabelForStatus(lesson.currentStatus.status) : 'Unknown'}
                    {/* Removed visual indicator for existing summary next to status */}
                </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex space-x-2 flex-wrap gap-y-2">
                    {isUpdating ? (
                        <Button variant="secondary" size="sm" disabled>
                            Updating...
                        </Button>
                    ) : (
                        <>
                            {availableTransitions.map(transition => (
                                <Button
                                    key={transition}
                                    onClick={() => handleTransitionButtonClick(transition)}
                                    variant={getButtonVariant(transition)}
                                    size="sm"
                                    disabled={isUpdating}
                                >
                                    {formatTransition(transition)}
                                </Button>
                            ))}

                            {availableTransitions.length === 0 && lesson.currentStatus?.status !== LessonStatusValue.COMPLETED && lesson.currentStatus?.status !== LessonStatusValue.VOIDED && (
                                <span className="text-sm text-gray-500 italic">No status actions</span>
                            )}
                        </>
                    )}
                </div>
                <div>
                    {/* Plan Button - only show if not VOIDED or COMPLETED and is TEACHER */}
                    {isTeacher && currentLessonStatus && currentLessonStatus !== LessonStatusValue.VOIDED && currentLessonStatus !== LessonStatusValue.COMPLETED && (
                        <Button
                            variant="accent"
                            size="sm"
                            onClick={() => navigate(`/teacher/lessons/${lesson.id}/create-plan`)}
                            className="ml-2"
                            disabled={isUpdating}
                        >
                            Plan
                        </Button>
                    )}
                    {/* New "Create Summary" button for COMPLETED lessons, only for TEACHER */}
                    {isTeacher && currentLessonStatus === LessonStatusValue.COMPLETED && !lesson.lessonSummary && (
                        <Button
                            variant="accent"
                            size="sm"
                            onClick={() => onOpenSummaryModal(lesson.id, lessonTitle)}
                            className="ml-2"
                            disabled={isUpdating}
                        >
                            Create Summary
                        </Button>
                    )}
                    {/* Indicator for existing summary - This was removed, adding it back */}
                    {isTeacher && currentLessonStatus === LessonStatusValue.COMPLETED && lesson.lessonSummary && (
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-semibold py-1 px-2 rounded-md bg-green-100 dark:bg-green-900">
                            Summary Added
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default TeacherLessonCard;
// Export the new modal if it's intended to be used elsewhere, or keep it co-located if only used here.
// For now, keeping it co-located.
export { LessonSummaryModal }; 