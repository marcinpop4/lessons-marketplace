import React, { useState, useEffect } from 'react';
import { Goal } from '@shared/models/Goal';
import { GoalStatusValue, GoalStatusTransition, GoalStatus } from '@shared/models/GoalStatus';
import Button from '@frontend/components/shared/Button/Button';
import { createGoal, abandonGoal, updateGoalStatus } from '@frontend/api/goalApi';
import GoalCard from './GoalCard';
import AddGoalForm from './AddGoalForm';

interface GoalManagerProps {
    initialGoals: Goal[];
    lessonId: string;
    onGoalsChange: (goals: Goal[]) => void;
}

const statusDisplayOrder: GoalStatusValue[] = [
    GoalStatusValue.CREATED,
    GoalStatusValue.IN_PROGRESS,
    GoalStatusValue.ACHIEVED,
    GoalStatusValue.ABANDONED
];

const formatStatus = (status: GoalStatusValue): string => {
    return GoalStatus.getDisplayLabelForStatus(status);
};

// Helper function to safely create Goal instance from API data
const createGoalModelFromData = (goalData: any): Goal => {
    // Check if currentStatus data exists and is an object
    if (!goalData.currentStatus || typeof goalData.currentStatus !== 'object') {
        console.error("Invalid or missing currentStatus in API data:", goalData);
        // Handle error appropriately - maybe create a default status or throw
        // For now, creating a default one to avoid crashing, but log error
        goalData.currentStatus = {
            id: goalData.currentStatusId || 'unknown',
            goalId: goalData.id,
            status: GoalStatusValue.CREATED,
            createdAt: new Date()
        };
    }
    // Create the GoalStatus instance first
    const currentStatusInstance = new GoalStatus(goalData.currentStatus);
    // Create the Goal instance, passing the GoalStatus instance
    return new Goal({ ...goalData, currentStatus: currentStatusInstance });
};

const GoalManager: React.FC<GoalManagerProps> = ({ initialGoals, lessonId, onGoalsChange }) => {
    const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
    const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleNewGoalAdded = (newGoalData: any) => { // Assume raw data from AddGoalForm
        const goalToAdd = createGoalModelFromData(newGoalData);
        const updatedGoals = [...initialGoals, goalToAdd];
        onGoalsChange(updatedGoals);
    };

    const handleDeleteGoal = async (goalIdToDelete: string) => {
        setDeletingGoalId(goalIdToDelete);
        setError(null);
        try {
            const abandonedGoalData = await abandonGoal(goalIdToDelete);
            // Use helper to create Goal model instance
            const abandonedGoal = createGoalModelFromData(abandonedGoalData);
            const updatedGoals = initialGoals.map(g =>
                g.id === goalIdToDelete ? abandonedGoal : g
            );
            onGoalsChange(updatedGoals);
        } catch (err) {
            console.error("Error deleting/abandoning goal:", err);
            setError(err instanceof Error ? err.message : 'Failed to abandon goal. Please try again.');
        } finally {
            setDeletingGoalId(null);
        }
    };

    const handleUpdateGoalStatus = async (goalId: string, transition: GoalStatusTransition, context?: any) => {
        setUpdatingGoalId(goalId);
        setError(null);
        try {
            const updatedGoalData = await updateGoalStatus(goalId, transition, context);
            // Use helper to create Goal model instance
            const updatedGoal = createGoalModelFromData(updatedGoalData);
            const updatedGoals = initialGoals.map(goal => {
                if (goal.id === goalId) {
                    return updatedGoal;
                }
                return goal;
            });
            onGoalsChange(updatedGoals);
        } catch (err) {
            console.error(`Error updating goal ${goalId} status with transition ${transition}:`, err);
            setError(err instanceof Error ? err.message : `Failed to update goal status.`);
        } finally {
            setUpdatingGoalId(null);
        }
    };

    const groupedGoals = initialGoals.reduce((acc, goal) => {
        const status = goal.currentStatus?.status || GoalStatusValue.CREATED;
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(goal);
        return acc;
    }, {} as Record<GoalStatusValue, Goal[]>);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Manage Goals</h2>

            <AddGoalForm lessonId={lessonId} onGoalAdded={handleNewGoalAdded} />

            {statusDisplayOrder.map(status => {
                const goalsInSection = groupedGoals[status] || [];
                return (
                    <section key={status} className="goal-status-section">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
                            {formatStatus(status)} ({goalsInSection.length})
                        </h3>
                        {goalsInSection.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {goalsInSection.map((goal) => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        onUpdateStatus={handleUpdateGoalStatus}
                                        isUpdating={updatingGoalId === goal.id}
                                        onDelete={handleDeleteGoal}
                                        isDeleting={deletingGoalId === goal.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic py-2">
                                No goals currently {GoalStatus.getDisplayLabelForStatus(status).toLowerCase()}.
                            </p>
                        )}
                    </section>
                );
            })}

            {error && <p className="text-sm text-red-500 mt-2">Error: {error}</p>}
        </div>
    );
};

export default GoalManager; 