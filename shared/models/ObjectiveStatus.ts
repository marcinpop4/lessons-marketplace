import { createChildLogger } from '../../config/logger.js';

const logger = createChildLogger('objective-status');

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * @openapi
 * components:
 *   schemas:
 *     ObjectiveStatusValue:
 *       type: string
 *       enum:
 *         - CREATED
 *         - IN_PROGRESS
 *         - ACHIEVED
 *         - ABANDONED
 *       description: Possible status values for a student objective.
 */
export enum ObjectiveStatusValue {
    CREATED = 'CREATED',       // The objective has been defined but not started.
    IN_PROGRESS = 'IN_PROGRESS', // The objective is actively being worked on.
    ACHIEVED = 'ACHIEVED',     // The objective has been successfully completed.
    ABANDONED = 'ABANDONED'    // The objective will no longer be pursued.
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ObjectiveStatusTransition:
 *       type: string
 *       enum:
 *         - START
 *         - COMPLETE
 *         - ABANDON
 *       description: Possible transition actions for an objective status.
 */
export enum ObjectiveStatusTransition {
    START = 'START',         // Begin working on the objective.
    COMPLETE = 'COMPLETE',   // Mark the objective as achieved.
    ABANDON = 'ABANDON'      // Give up on the objective (soft delete).
}

/**
 * Properties required to create an ObjectiveStatus instance.
 */
interface ObjectiveStatusProps {
    id: string;
    objectiveId: string;
    status: ObjectiveStatusValue;
    context?: JsonValue | null; // Optional context
    createdAt?: Date; // Optional, defaults to new Date()
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ObjectiveStatus:
 *       type: object
 *       description: Represents a snapshot of an objective's status at a point in time.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         objectiveId:
 *           type: string
 *           description: ID of the objective this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/ObjectiveStatusValue'
 *         context:
 *           type: object # Represents JSON
 *           nullable: true
 *           description: Optional context data associated with this status change.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when this status was recorded.
 *       required:
 *         - id
 *         - objectiveId
 *         - status
 *         - createdAt
 */
export class ObjectiveStatus {
    id: string;
    objectiveId: string;
    status: ObjectiveStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        objectiveId,
        status,
        context = null,
        createdAt = new Date()
    }: ObjectiveStatusProps) {
        this.id = id;
        this.objectiveId = objectiveId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;

        // Basic validation
        if (!Object.values(ObjectiveStatusValue).includes(status)) {
            logger.error('Invalid status value provided in ObjectiveStatus constructor', { status });
            throw new Error(`Invalid status value: ${status}`);
        }
    }

    /**
     * Create a new ObjectiveStatus record.
     */
    static create(
        id: string,
        objectiveId: string,
        status: ObjectiveStatusValue,
        context: JsonValue | null = null
    ): ObjectiveStatus {
        // Add validation within the static create method as well
        if (!Object.values(ObjectiveStatusValue).includes(status)) {
            logger.error('Invalid status value provided in ObjectiveStatus.create', { status });
            throw new Error(`Invalid status value: ${status}`);
        }
        return new ObjectiveStatus({ id, objectiveId, status, context });
    }

    /**
     * Defines valid status transitions and their results.
     */
    static readonly StatusTransitions = {
        [ObjectiveStatusValue.CREATED]: {
            [ObjectiveStatusTransition.START]: ObjectiveStatusValue.IN_PROGRESS,
            [ObjectiveStatusTransition.COMPLETE]: ObjectiveStatusValue.ACHIEVED,
            [ObjectiveStatusTransition.ABANDON]: ObjectiveStatusValue.ABANDONED
        },
        [ObjectiveStatusValue.IN_PROGRESS]: {
            [ObjectiveStatusTransition.COMPLETE]: ObjectiveStatusValue.ACHIEVED,
            [ObjectiveStatusTransition.ABANDON]: ObjectiveStatusValue.ABANDONED
        },
        [ObjectiveStatusValue.ACHIEVED]: {
            // No transitions out of ACHIEVED usually. ABANDON might mean retracting.
            [ObjectiveStatusTransition.ABANDON]: ObjectiveStatusValue.ABANDONED
        },
        [ObjectiveStatusValue.ABANDONED]: {
            // No transitions out of ABANDONED.
        }
    } as const;

    /**
     * Gets the resulting status after a transition.
     */
    static getResultingStatus(currentStatus: ObjectiveStatusValue, transition: ObjectiveStatusTransition): ObjectiveStatusValue | undefined {
        const possibleTransitions = ObjectiveStatus.StatusTransitions[currentStatus];
        // Use type assertion safely
        if (transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    /**
     * Validates if a transition is allowed from the current status.
     */
    static isValidTransition(currentStatus: ObjectiveStatusValue, transition: ObjectiveStatusTransition): boolean {
        const possibleTransitions = ObjectiveStatus.StatusTransitions[currentStatus];
        // Ensure possibleTransitions exists before checking the key
        return !!possibleTransitions && (transition in possibleTransitions);
    }

    /**
     * Gets a user-friendly display label for a given status value.
     */
    static getDisplayLabelForStatus(status: ObjectiveStatusValue): string {
        switch (status) {
            case ObjectiveStatusValue.CREATED: return 'Created';
            case ObjectiveStatusValue.IN_PROGRESS: return 'In Progress';
            case ObjectiveStatusValue.ACHIEVED: return 'Achieved';
            case ObjectiveStatusValue.ABANDONED: return 'Abandoned';
            default:
                // Handle potential unknown status values gracefully
                const exhaustiveCheck: never = status;
                logger.warn('Unknown status value in ObjectiveStatus.getDisplayLabelForStatus', { status });
                return String(status) || 'Unknown Status';
        }
    }

    /**
    * Gets a user-friendly display label for a given transition action.
    */
    static getDisplayLabelForTransition(transition: ObjectiveStatusTransition): string {
        if (!transition) return 'Unknown Action';
        // Simple conversion: Capitalize first letter, rest lowercase
        return transition.charAt(0).toUpperCase() + transition.slice(1).toLowerCase();
    }
} 