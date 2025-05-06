// Define a JSON value type
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonStatusValue:
 *       type: string
 *       enum:
 *         - REQUESTED
 *         - ACCEPTED
 *         - REJECTED
 *         - COMPLETED
 *         - VOIDED
 *       description: Possible status values for a lesson.
 */
export enum LessonStatusValue {
    REQUESTED = 'REQUESTED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
    VOIDED = 'VOIDED'
}

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonStatusTransition:
 *       type: string
 *       enum:
 *         - ACCEPT
 *         - REJECT
 *         - COMPLETE
 *         - VOID
 *       description: Possible transition actions for a lesson status.
 */
export enum LessonStatusTransition {
    ACCEPT = 'ACCEPT',
    REJECT = 'REJECT',
    COMPLETE = 'COMPLETE',
    VOID = 'VOID'
}

// Define the type alias outside the class, referencing the static property
export type LessonStatusTransitionName = keyof (typeof LessonStatus.StatusTransitions)[LessonStatusValue];

/**
 * Properties required to create a LessonStatus instance.
 */
interface LessonStatusProps {
    id: string;
    lessonId: string;
    status: LessonStatusValue;
    context?: JsonValue | null; // Optional, defaults to null
    createdAt?: Date; // Optional, defaults to new Date()
}

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonStatus:
 *       type: object
 *       description: Represents a snapshot of a lesson's status at a point in time.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         lessonId:
 *           type: string
 *           description: ID of the lesson this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/LessonStatusValue'
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
 *         - lessonId
 *         - status
 *         - createdAt
 */
export class LessonStatus {
    id: string;
    lessonId: string;
    status: LessonStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        lessonId,
        status,
        context = null,
        createdAt = new Date()
    }: LessonStatusProps) {
        this.id = id;
        this.lessonId = lessonId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    /**
     * Create a new LessonStatus record.
     */
    static create(
        id: string,
        lessonId: string,
        status: LessonStatusValue,
        context: JsonValue | null = null
    ): LessonStatus {
        return new LessonStatus({ id, lessonId, status, context });
    }

    /**
     * Validates a status string and ensures it's a valid LessonStatusValue.
     * Throws an error if the status is invalid.
     * @param status Status string to validate
     * @returns The validated LessonStatusValue enum value
     */
    static validateStatus(status: string): LessonStatusValue {
        if (Object.values(LessonStatusValue).includes(status as LessonStatusValue)) {
            return status as LessonStatusValue;
        }

        throw new Error(`Invalid lesson status value: ${status}`);
    }

    /**
     * Parses context from JSON if needed and returns the context object.
     * This is useful when working with raw database results.
     * @returns The parsed context object
     */
    getContext(): JsonValue | null {
        // Handle context if it's stored as a JSON string
        if (this.context === null) {
            return null;
        }

        // If already an object, return as is
        if (typeof this.context === 'object') {
            return this.context;
        }

        // If it's a string (JSON), try to parse it
        if (typeof this.context === 'string') {
            try {
                return JSON.parse(this.context);
            } catch (e) {
                console.warn('Failed to parse LessonStatus context as JSON:', e);
                return this.context; // Return as is if parsing fails
            }
        }

        return this.context;
    }

    /**
     * Gets a user-friendly display label for a given status value.
     * @param status The status value enum.
     * @returns A display-friendly string.
     */
    static getDisplayLabelForStatus(status: LessonStatusValue): string {
        if (!status) return 'Unknown Status';
        // Simple conversion: Replace underscores, capitalize words
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Defines valid status transitions and their results.
     */
    static readonly StatusTransitions = {
        [LessonStatusValue.REQUESTED]: {
            [LessonStatusTransition.ACCEPT]: LessonStatusValue.ACCEPTED,
            [LessonStatusTransition.REJECT]: LessonStatusValue.REJECTED
        },
        [LessonStatusValue.ACCEPTED]: {
            [LessonStatusTransition.COMPLETE]: LessonStatusValue.COMPLETED,
            [LessonStatusTransition.VOID]: LessonStatusValue.VOIDED
        },
        [LessonStatusValue.REJECTED]: {
            [LessonStatusTransition.VOID]: LessonStatusValue.VOIDED
        },
        [LessonStatusValue.COMPLETED]: {
            [LessonStatusTransition.VOID]: LessonStatusValue.VOIDED
        },
        [LessonStatusValue.VOIDED]: {}
    } as const;

    /**
     * Gets the resulting status after a transition.
     * @param currentStatus The current status value
     * @param transition The requested transition
     * @returns The resulting status value if valid, undefined otherwise
     */
    static getResultingStatus(currentStatus: LessonStatusValue, transition: LessonStatusTransition): LessonStatusValue | undefined {
        const possibleTransitions = LessonStatus.StatusTransitions[currentStatus];
        if (possibleTransitions && transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    /**
     * Validates if a transition is allowed from the current status.
     * @param currentStatus The current status value
     * @param transition The requested transition
     * @returns True if the transition is valid, false otherwise
     */
    static isValidTransition(currentStatus: LessonStatusValue, transition: LessonStatusTransition): boolean {
        const possibleTransitions = LessonStatus.StatusTransitions[currentStatus];
        return !!possibleTransitions && transition in possibleTransitions;
    }

    /**
     * Gets a user-friendly display label for a given transition action.
     * @param transition The transition enum value
     * @returns A display-friendly string
     */
    static getDisplayLabelForTransition(transition: LessonStatusTransition): string {
        if (!transition) return 'Unknown Action';
        // Simple conversion: Capitalize first letter, rest lowercase
        return transition.charAt(0).toUpperCase() + transition.slice(1).toLowerCase();
    }

    /**
     * Gets the valid transition *enum values* allowed from a given status.
     * @param currentStatus The current status value
     * @returns An array of valid LessonStatusTransition enum values.
     */
    static getValidTransitionsForStatus(currentStatus: LessonStatusValue): LessonStatusTransition[] {
        const possibleTransitionsObject = LessonStatus.StatusTransitions[currentStatus];
        if (!possibleTransitionsObject) {
            return [];
        }

        const validTransitions: LessonStatusTransition[] = [];
        for (const key in possibleTransitionsObject) {
            // Ensure it's a valid key of the enum
            if (Object.prototype.hasOwnProperty.call(LessonStatusTransition, key)) {
                // Directly access the enum value using the key
                validTransitions.push(LessonStatusTransition[key as keyof typeof LessonStatusTransition]);
            }
        }
        return validTransitions;
    }
}