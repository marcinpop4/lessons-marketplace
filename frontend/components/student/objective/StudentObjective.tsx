import React, { useState } from 'react';
import Card from '../../shared/Card/Card'; // Adjust path as needed
import { Objective } from '@shared/models/Objective';
import { formatDisplayLabel } from '@shared/models/LessonType';
import { ObjectiveStatus, ObjectiveStatusValue, ObjectiveStatusTransition } from '@shared/models/ObjectiveStatus';
import { Button } from '@frontend/components/shared'; // Import Button component

interface StudentObjectiveProps {
    objective: Objective;
    onStatusUpdate: () => void; // Callback to parent to refresh data
}

const StudentObjective: React.FC<StudentObjectiveProps> = ({ objective, onStatusUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Determine current status safely
    const currentStatus = objective.currentStatus?.status ?? ObjectiveStatusValue.CREATED;

    // Find available transitions for the current status
    const availableTransitions = Object.entries(ObjectiveStatus.StatusTransitions[currentStatus] || {})
        .map(([transition]) => transition as ObjectiveStatusTransition); // Get transition keys

    const handleTransitionClick = async (transition: ObjectiveStatusTransition) => {
        setIsUpdating(true);
        setUpdateError(null);

        // Calculate the resulting status
        const newStatus = ObjectiveStatus.getResultingStatus(currentStatus, transition);

        if (!newStatus) {
            setUpdateError(`Invalid transition (${transition}) from current status (${currentStatus}).`);
            setIsUpdating(false);
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            // Send the *new status* in the request body
            const body = JSON.stringify({ status: newStatus });

            const response = await fetch(`/api/v1/objectives/${objective.id}`,
                {
                    method: 'PATCH',
                    headers: headers,
                    credentials: 'include',
                    body: body,
                }
            );

            if (!response.ok) {
                let errorMsg = `Failed to update status: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            // Trigger data refresh in the parent component
            onStatusUpdate();

        } catch (err: any) {
            console.error("Error updating objective status:", err);
            setUpdateError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card
            key={objective.id} // Key is still useful here if mapping is done inside this component in future
            title={objective.title}
            variant="primary" // Or choose variant based on status?
            className="objective-card"
            headingLevel="h3"
        >
            <p className="text-gray-700 dark:text-gray-300 mb-2">{objective.description}</p>
            {/* Display Lesson Type */}
            {objective.lessonType && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Type: {formatDisplayLabel(objective.lessonType)}
                </p>
            )}
            {/* Display Target Date */}
            {objective.targetDate && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Target: {new Date(objective.targetDate).toLocaleDateString()}
                </p>
            )}
            {/* Display Status */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Status: {ObjectiveStatus.getDisplayLabelForStatus(currentStatus)}
            </p>

            {/* Action Buttons Section */}
            {availableTransitions.length > 0 && (
                <div className="mt-auto pt-3 border-t dark:border-gray-700 flex flex-wrap gap-2">
                    {availableTransitions.map((transition) => {
                        // Determine button variant based on transition type
                        const buttonVariant =
                            (transition === ObjectiveStatusTransition.START || transition === ObjectiveStatusTransition.COMPLETE)
                                ? 'primary'
                                : 'secondary';

                        return (
                            <Button
                                key={transition}
                                variant={buttonVariant} // Use determined variant
                                size="sm"
                                onClick={() => handleTransitionClick(transition)}
                                disabled={isUpdating}
                            >
                                {ObjectiveStatus.getDisplayLabelForTransition(transition)}
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Error Display */}
            {updateError && (
                <p className="text-xs text-red-500 mt-2">Error: {updateError}</p>
            )}
        </Card>
    );
};

export default StudentObjective; 