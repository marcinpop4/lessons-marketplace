import { Goal } from './Goal.js';
import { JsonValue } from '../types/JsonTypes.js'; // Import the shared type

/**
 * @openapi
 * components:
 *   schemas:
 *     GoalStatusValue:
 *       type: string
 *       enum:
 *         - CREATED
 *         - IN_PROGRESS
 *         - ACHIEVED
 *         - ABANDONED
 *       description: Possible status values for a goal.
 */
export enum GoalStatusValue {
    CREATED = 'CREATED',       // The goal has been defined but not started.
    IN_PROGRESS = 'IN_PROGRESS', // The goal is actively being worked on.
    ACHIEVED = 'ACHIEVED',     // The goal has been successfully completed.
    ABANDONED = 'ABANDONED'    // The goal will no longer be pursued.
}

/**
 * @openapi
 * components:
 *   schemas:
 *     GoalStatusTransition:
 *       type: string
 *       enum:
 *         - START
 *         - COMPLETE
 *         - ABANDON
 *       description: Possible transition actions for a goal status.
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
 * @openapi
 * components:
 *   schemas:
 *     GoalStatus:
 *       type: object
 *       description: Represents a snapshot of a goal's status at a point in time.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         goalId:
 *           type: string
 *           description: ID of the goal this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/GoalStatusValue'
 *         context:
 *           type: object # Representing JSON
 *           nullable: true
 *           description: Optional context data associated with this status change.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when this status was recorded.
 *       required:
 *         - id
 *         - goalId
 *         - status
 *         - createdAt
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
} 