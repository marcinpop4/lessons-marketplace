import React, { useState } from 'react';
import { Goal } from '@shared/models/Goal';
import { GoalStatusValue, GoalStatusTransition, GoalStatus } from '@shared/models/GoalStatus';
import Card from '@frontend/components/shared/Card/Card';
import Button from '@frontend/components/shared/Button/Button';

// Simple Modal Component (inline for now, similar to TeacherLessonCard)
// Define props for the Notes Modal
interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (notes: string) => void;
    goalTitle: string; // Use goal title for modal
}

const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, onConfirm, goalTitle }) => {
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
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Complete Goal: {goalTitle}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Please enter completion notes:</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                    placeholder="e.g., Student successfully demonstrated the technique..."
                />
                <div className="mt-5 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirm}>Confirm Completion</Button>
                </div>
            </div>
        </div>
    );
};

interface GoalCardProps {
    goal: Goal; // Receives the full Goal object, including currentStatus object
    onUpdateStatus: (goalId: string, transition: GoalStatusTransition, context?: any) => void;
    isUpdating: boolean;
    onDelete: (goalId: string) => void;
    isDeleting: boolean;
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
};

const GoalCard: React.FC<GoalCardProps> = ({
    goal,
    onUpdateStatus,
    isUpdating,
    onDelete,
    isDeleting
}) => {
    // --- State for Modal ---
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

    // Derive status value from the goal object
    const currentStatusValue = goal.currentStatus?.status || GoalStatusValue.CREATED;

    // Determine card variant based on status for the wrapper card
    const cardVariant = currentStatusValue === GoalStatusValue.ABANDONED ? 'secondary' : 'primary';

    // Use derived status value for transitions
    const possibleTransitionsMap = GoalStatus.StatusTransitions[currentStatusValue] || {};
    const availableTransitions = (Object.keys(possibleTransitionsMap) as GoalStatusTransition[])
        .filter(t => t !== GoalStatusTransition.ABANDON);

    // Use utility directly for transition label
    const formatTransition = (transition: GoalStatusTransition): string => {
        return GoalStatus.getDisplayLabelForTransition(transition);
    };

    // Determine button variant for transitions
    const getButtonVariant = (transition: GoalStatusTransition): 'primary' | 'secondary' => {
        switch (transition) {
            case GoalStatusTransition.START:
            case GoalStatusTransition.COMPLETE:
                return 'primary';
            // Add cases for other transitions if needed
            default:
                return 'secondary';
        }
    };

    // Use derived status value for abandon check
    const canAbandon = GoalStatus.isValidTransition(currentStatusValue, GoalStatusTransition.ABANDON);

    // --- Button Click Handler --- Updated Logic
    const handleButtonClick = (transition: GoalStatusTransition) => {
        if (transition === GoalStatusTransition.COMPLETE) {
            setIsNotesModalOpen(true); // Open modal for COMPLETE
        } else {
            // Call parent's onUpdateStatus directly for other transitions (e.g., START)
            onUpdateStatus(goal.id, transition);
        }
    };

    // --- Modal Handlers ---
    const handleConfirmCompletion = (notes: string) => {
        // Call parent's handler with the notes as context
        onUpdateStatus(goal.id, GoalStatusTransition.COMPLETE, { notes });
        setIsNotesModalOpen(false); // Close modal
    };

    const handleCloseModal = () => {
        setIsNotesModalOpen(false);
    };

    // Helper to format date safely
    const formatDate = (dateInput: Date | string | undefined | null): string => {
        if (!dateInput) return 'N/A';
        try {
            return new Date(dateInput).toLocaleDateString();
        } catch (e) {
            console.error("Error formatting date:", dateInput, e);
            return 'Invalid Date';
        }
    }

    return (
        <>
            <Card
                title={goal.title}
                variant={cardVariant}
                className="goal-card"
                headingLevel="h3"
            >
                <p>
                    {goal.description}
                </p>
                {goal.estimatedLessonCount != null && (
                    <p>
                        <span className="font-semibold mr-1">Est. Lessons:</span>{goal.estimatedLessonCount}
                    </p>
                )}
                <p>
                    <span className="font-semibold mr-1">Status:</span>{GoalStatus.getDisplayLabelForStatus(currentStatusValue)}
                </p>
                <p>
                    <span className="font-semibold mr-1">Created:</span>{formatDate(goal.createdAt)}
                </p>
                {currentStatusValue === GoalStatusValue.ACHIEVED && (
                    <p>
                        <span className="font-semibold mr-1">Achieved:</span>{formatDate(goal.currentStatus?.createdAt)}
                    </p>
                )}
                {currentStatusValue === GoalStatusValue.ACHIEVED && goal.currentStatus?.context && typeof goal.currentStatus.context === 'object' && 'notes' in goal.currentStatus.context && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold mr-1">Notes:</span>{String(goal.currentStatus.context.notes) || 'No notes provided.'}
                    </p>
                )}

                <div className="flex space-x-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                    {availableTransitions.map(transition => (
                        <Button
                            key={transition}
                            variant={getButtonVariant(transition)}
                            size="sm"
                            onClick={() => handleButtonClick(transition)}
                            disabled={isUpdating || isDeleting}
                        >
                            {formatTransition(transition)}
                        </Button>
                    ))}
                    {canAbandon && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onDelete(goal.id)}
                            disabled={isDeleting || isUpdating}
                        >
                            {isDeleting ? 'Deleting...' : 'Abandon'}
                        </Button>
                    )}
                </div>
            </Card>

            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmCompletion}
                goalTitle={goal.title}
            />
        </>
    );
};

export default GoalCard; 