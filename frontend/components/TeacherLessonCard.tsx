import React from 'react';
// Import shared models
import { Lesson } from '@shared/models/Lesson';
import { LessonStatus, LessonStatusValue } from '@shared/models/LessonStatus';
import Card from '@frontend/components/shared/Card/Card'; // Import shared Card
import Button from '@frontend/components/shared/Button/Button'; // Import shared Button
import { updateLessonStatus } from '@frontend/api/lessonApi'; // Import the API function

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
    // Function prop for handling status updates
    onUpdateStatus?: (lessonId: string, newStatus: LessonStatusValue) => Promise<void>; // Make optional
    isUpdating?: boolean; // Add optional prop for loading state
}

const TeacherLessonCard: React.FC<TeacherLessonCardProps> = ({
    lesson,
    currentStatus,
    onUpdateStatus, // Destructure the prop
    isUpdating = false // Default to false
}) => {
    const [localIsUpdating, setLocalIsUpdating] = React.useState(isUpdating);
    const [statusUpdateError, setStatusUpdateError] = React.useState<string | null>(null);

    // Call the prop function passed from the parent or use the direct API call
    const handleStatusUpdate = async (newStatus: LessonStatusValue) => {
        try {
            setLocalIsUpdating(true);
            setStatusUpdateError(null);

            if (typeof onUpdateStatus === 'function') {
                // Use parent's handler if provided
                await onUpdateStatus(lesson.id, newStatus);
            } else {
                // Otherwise call API directly
                await updateLessonStatus(lesson.id, newStatus);
                // Reload the page to reflect changes
                window.location.reload();
            }
        } catch (error) {
            console.error('Error updating lesson status:', error);
            setStatusUpdateError('Failed to update status. Please try again.');
        } finally {
            setLocalIsUpdating(false);
        }
    };

    // Determine possible next statuses
    let possibleNextStatuses = Object.values(LessonStatusValue).filter(
        newStatus => LessonStatus.isValidTransition(currentStatus, newStatus) && newStatus !== currentStatus
    );

    // Prioritize 'Completed' button to be first
    if (possibleNextStatuses.includes(LessonStatusValue.COMPLETED)) {
        possibleNextStatuses = [
            LessonStatusValue.COMPLETED,
            ...possibleNextStatuses.filter(status => status !== LessonStatusValue.COMPLETED)
        ];
    }

    // Format status for display (still needed for grouping title, but not subtitle)
    // const formattedStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1).toLowerCase();
    const studentName = `${lesson.student?.firstName || 'N/A'} ${lesson.student?.lastName || ''}`;

    // Function to determine button variant based on status
    const getButtonVariant = (status: LessonStatusValue): 'primary' | 'secondary' => {
        switch (status) {
            case LessonStatusValue.ACCEPTED:
            case LessonStatusValue.COMPLETED:
                return 'primary';
            case LessonStatusValue.REJECTED:
            case LessonStatusValue.VOIDED:
                return 'secondary';
            default:
                return 'secondary'; // Default to secondary for any other cases
        }
    };

    return (
        <Card
            title={`Lesson with ${studentName}`}
            // Remove Status and Start Time from subtitle
            // subtitle={`Status: ${formattedStatus} | Start: ${lesson.startTime ? new Date(lesson.startTime).toLocaleString() : 'N/A'}`}
            className="mb-4"
            headingLevel="h4"
        >
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {/* Move Start Time here */}
                <p>Start Time: {lesson.startTime ? new Date(lesson.startTime).toLocaleString() : 'N/A'}</p>
                <p>Duration: {lesson.durationMinutes || 'N/A'} minutes</p>
                <p>Address: {lesson.address ? lesson.address.toString() : 'N/A'}</p>
                <p>Cost: {lesson.getFormattedCost ? lesson.getFormattedCost() : ('N/A')}</p>
                <p>Status: <span className="font-medium capitalize">{currentStatus.toLowerCase()}</span></p>
            </div>

            {statusUpdateError && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {statusUpdateError}
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                {possibleNextStatuses.length > 0 ? (
                    possibleNextStatuses.map(nextStatus => (
                        <Button
                            key={nextStatus}
                            onClick={() => handleStatusUpdate(nextStatus)}
                            variant={getButtonVariant(nextStatus)}
                            size="sm"
                            disabled={localIsUpdating || isUpdating} // Use either local or prop state
                        >
                            {localIsUpdating ? 'Updating...' : (nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1).toLowerCase())}
                        </Button>
                    ))
                ) : (
                    <span className="text-sm text-gray-500 italic">No actions available</span>
                )}
            </div>
        </Card>
    );
};

export default TeacherLessonCard; 