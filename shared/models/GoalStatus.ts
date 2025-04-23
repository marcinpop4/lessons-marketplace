import { JsonValue } from '@prisma/client/runtime/library';

/**
 * Possible status values for a goal associated with a lesson.
 */
export enum GoalStatusValue {
    CREATED = 'CREATED',       // The goal has been defined but not started.
    IN_PROGRESS = 'IN_PROGRESS', // The goal is actively being worked on.
    ACHIEVED = 'ACHIEVED',     // The goal has been successfully completed.
    ABANDONED = 'ABANDONED'    // The goal will no longer be pursued.
}

/**
 * Defines the possible transition actions that can be taken on a goal.
 */
export enum GoalStatusTransition {
    START = 'START',         // Begin working on the goal.
    COMPLETE = 'COMPLETE',   // Mark the goal as achieved.
    ABANDON = 'ABANDON'      // Give up on the goal.
}

/**
 * Properties required to create a GoalStatus instance.
 */
interface GoalStatusProps {
    id: string;
    goalId: string;
    status: GoalStatusValue;
    context?: JsonValue | null; // Optional, defaults to null
    createdAt?: Date; // Optional, defaults to new Date()
}

/**
 * Represents a status change for a goal.
 * Each status change is immutable and creates a new record.
 */
export class GoalStatus {
    id: string;
    goalId: string;
    status: GoalStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        goalId,
        status,
        context = null,
        createdAt = new Date()
    }: GoalStatusProps) {
        this.id = id;
        this.goalId = goalId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    /**
     * Create a new GoalStatus record.
     */
    static create(
        id: string,
        goalId: string,
        status: GoalStatusValue,
        context: JsonValue | null = null
    ): GoalStatus {
        return new GoalStatus({ id, goalId, status, context });
    }

    /**
     * Defines valid status transitions and their results.
     */
    static readonly StatusTransitions = {
        [GoalStatusValue.CREATED]: {
            [GoalStatusTransition.START]: GoalStatusValue.IN_PROGRESS,
            [GoalStatusTransition.ABANDON]: GoalStatusValue.ABANDONED
        },
        [GoalStatusValue.IN_PROGRESS]: {
            [GoalStatusTransition.COMPLETE]: GoalStatusValue.ACHIEVED,
            [GoalStatusTransition.ABANDON]: GoalStatusValue.ABANDONED
        },
        [GoalStatusValue.ACHIEVED]: {
            // Typically no transitions out of ACHIEVED unless reactivated,
            // but ABANDON could represent retracting achievement? Or VOID?
            // For now, let's keep it simple. Revisit if needed.
            [GoalStatusTransition.ABANDON]: GoalStatusValue.ABANDONED // Or maybe VOID?
        },
        [GoalStatusValue.ABANDONED]: {
            // No transitions out of ABANDONED typically.
        }
    } as const; // Ensure immutability and type safety

    /**
     * Gets the resulting status after a transition.
     */
    static getResultingStatus(currentStatus: GoalStatusValue, transition: GoalStatusTransition): GoalStatusValue | undefined {
        const possibleTransitions = GoalStatus.StatusTransitions[currentStatus];
        // Use type assertion safely due to the structure of StatusTransitions
        if (transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    /**
     * Validates if a transition is allowed from the current status.
     */
    static isValidTransition(currentStatus: GoalStatusValue, transition: GoalStatusTransition): boolean {
        const possibleTransitions = GoalStatus.StatusTransitions[currentStatus];
        return transition in possibleTransitions;
    }

    /**
     * Gets a user-friendly display label for a given status value.
     * @param status The status value enum.
     * @returns A display-friendly string.
     */
    static getDisplayLabelForStatus(status: GoalStatusValue): string {
        switch (status) {
            case GoalStatusValue.CREATED:
                return 'Ready to Start';
            case GoalStatusValue.IN_PROGRESS:
                return 'In Progress';
            case GoalStatusValue.ACHIEVED:
                return 'Achieved';
            case GoalStatusValue.ABANDONED:
                return 'Abandoned';
            default:
                console.warn(`[GoalStatus.getDisplayLabelForStatus] Unexpected status value: ${status}`);
                return status || 'Unknown Status';
        }
    }

    /**
     * Gets a user-friendly display label for a given transition action.
     * @param transition The transition enum value.
     * @returns A display-friendly string.
     */
    static getDisplayLabelForTransition(transition: GoalStatusTransition): string {
        if (!transition) return 'Unknown Action';
        // Simple conversion: Capitalize first letter, rest lowercase
        return transition.charAt(0).toUpperCase() + transition.slice(1).toLowerCase();
    }

    /**
     * Creates a GoalStatus instance from a Prisma GoalStatus object.
     * @param dbGoalStatus The GoalStatus object fetched from Prisma.
     * @returns A GoalStatus instance.
     */
    static fromDb(dbGoalStatus: { id: string, goalId: string, status: string, context: JsonValue | null, createdAt: Date }): GoalStatus {
        // Validate the status string against the enum
        const statusValue = dbGoalStatus.status as GoalStatusValue;
        if (!Object.values(GoalStatusValue).includes(statusValue)) {
            console.error(`[GoalStatus.fromDb] Invalid status value received from DB: ${dbGoalStatus.status} for GoalStatus ID: ${dbGoalStatus.id}`);
            // Decide on error handling: throw, return null, or use a default?
            // Throwing an error is often safest for data integrity issues.
            throw new Error(`Invalid status value '${dbGoalStatus.status}' encountered for GoalStatus ${dbGoalStatus.id}`);
        }

        return new GoalStatus({
            id: dbGoalStatus.id,
            goalId: dbGoalStatus.goalId,
            status: statusValue,
            context: dbGoalStatus.context, // Prisma's JsonValue maps correctly
            createdAt: dbGoalStatus.createdAt
        });
    }
} 