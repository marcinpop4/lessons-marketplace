import React from 'react';
// Import shared models
import { Lesson } from '@shared/models/Lesson';
// Import necessary enums and the class for static methods
import { LessonStatusValue, LessonStatusTransition, LessonStatus } from '@shared/models/LessonStatus';
import Card from '@frontend/components/shared/Card/Card'; // Import shared Card
import Button from '@frontend/components/shared/Button/Button'; // Import shared Button
// Removed unused import: import { updateLessonStatus } from '@frontend/api/lessonApi';

// Remove placeholder type
// interface LessonPlaceholder {
//   id: string;
//   studentName: string;
//   dateTime: string;
//   status: string; // Use LessonStatusValue enum later
//   // Add other relevant details
// }

interface TeacherLessonCardProps {
    lesson: Lesson; // Use actual Lesson type
    currentStatus: LessonStatusValue; // Pass current status explicitly
    // Updated Function prop signature for handling status updates via transition
    onUpdateStatus: (lessonId: string, currentStatus: LessonStatusValue, transition: LessonStatusTransition) => void;
    isUpdating: boolean; // Use loading state from parent
}

const TeacherLessonCard: React.FC<TeacherLessonCardProps> = ({
    lesson,
    currentStatus,
    onUpdateStatus, // Use the required prop from parent
    isUpdating // Use the required prop from parent
}) => {
    // Removed local state for loading and error, now handled by parent

    // --- New Logic ---
    const student = lesson.quote.lessonRequest.student; // Access student details
    const request = lesson.quote.lessonRequest; // Access request details

    // Get the map of possible transitions for the current status
    const possibleTransitionsMap = LessonStatus.StatusTransitions[currentStatus] || {};
    // Extract the transition names (keys) from the map
    const availableTransitions = Object.keys(possibleTransitionsMap) as LessonStatusTransition[];

    // Helper to format transition enum keys (e.g., ACCEPT -> Accept)
    const formatTransition = (transition: LessonStatusTransition): string => {
        if (!transition) return '';
        return transition.charAt(0).toUpperCase() + transition.slice(1).toLowerCase();
    };
    // --- End New Logic ---

    // Function to determine button variant based on transition
    const getButtonVariant = (transition: LessonStatusTransition): 'primary' | 'secondary' => {
        switch (transition) {
            case LessonStatusTransition.ACCEPT:
            case LessonStatusTransition.COMPLETE:
                return 'primary';
            case LessonStatusTransition.REJECT:
            case LessonStatusTransition.VOID:
                return 'secondary';
            default:
                return 'primary'; // Default to primary
        }
    };

    // Use original studentName logic if needed for title
    const studentName = `${student?.firstName || 'N/A'} ${student?.lastName || ''}`;

    return (
        <Card
            title={`Lesson with ${studentName}`}
            className="mb-4"
            headingLevel="h4"
        >
            {/* Original body content */}
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>Start Time: {request?.startTime ? new Date(request.startTime).toLocaleString() : 'N/A'}</p>
                <p>Duration: {request?.durationMinutes || 'N/A'} minutes</p>
                <p>Address: {request?.address?.toString() || 'N/A'}</p>
                <p>Cost: {lesson.quote?.getFormattedCost() || 'N/A'}</p>
                <p>Status: <span className="font-medium capitalize">{currentStatus.toLowerCase()}</span></p>
            </div>

            {/* Removed local statusUpdateError display */}

            {/* Updated Action Buttons based on transitions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                {isUpdating ? (
                    // Display loading state using the isUpdating prop
                    <Button variant="secondary" size="sm" disabled>
                        Updating...
                    </Button>
                ) : (
                    availableTransitions.length > 0 ? (
                        availableTransitions.map(transition => (
                            <Button
                                key={transition}
                                // Call the parent's onUpdateStatus with the transition
                                onClick={() => onUpdateStatus(lesson.id, currentStatus, transition)}
                                variant={getButtonVariant(transition)}
                                size="sm"
                                // Disable based on the parent's isUpdating state
                                disabled={isUpdating}
                            >
                                {/* Display formatted transition name */}
                                {formatTransition(transition)}
                            </Button>
                        ))
                    ) : (
                        <span className="text-sm text-gray-500 italic">No actions available</span>
                    )
                )}
            </div>
        </Card>
    );
};

export default TeacherLessonCard; 