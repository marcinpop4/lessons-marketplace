import React from 'react';
// Import shared models
import { Lesson } from '@shared/models/Lesson';
import { LessonStatus, LessonStatusValue } from '@shared/models/LessonStatus';
import Card from '@frontend/components/shared/Card/Card'; // Import shared Card
import Button from '@frontend/components/shared/Button/Button'; // Import shared Button

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
    // Add a function prop for handling status updates
    // onUpdateStatus: (lessonId: string, newStatus: LessonStatusValue) => Promise<void>;
}

const TeacherLessonCard: React.FC<TeacherLessonCardProps> = ({
    lesson,
    currentStatus
    // onUpdateStatus 
}) => {

    // Placeholder function for handling status change - implement later
    const handleStatusUpdate = (newStatus: LessonStatusValue) => {
        console.log(`TODO: Update lesson ${lesson.id} to status ${newStatus}`);
        // Call onUpdateStatus(lesson.id, newStatus);
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
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                {possibleNextStatuses.length > 0 ? (
                    possibleNextStatuses.map(nextStatus => (
                        <Button
                            key={nextStatus}
                            onClick={() => handleStatusUpdate(nextStatus)}
                            variant={getButtonVariant(nextStatus)}
                            size="sm"
                        >
                            {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1).toLowerCase()}
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