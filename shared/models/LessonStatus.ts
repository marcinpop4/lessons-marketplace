// Define a JSON value type
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * Possible status values for a lesson.
 */
export enum LessonStatusValue {
    REQUESTED = 'REQUESTED',
    ACCEPTED = 'ACCEPTED',
    DEFINED = 'DEFINED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
    VOIDED = 'VOIDED'
}

/**
 * Defines the possible transition actions that can be taken on a lesson.
 */
export enum LessonStatusTransition {
    ACCEPT = 'ACCEPT',
    DEFINE = 'DEFINE',
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
 * Represents a status change for a lesson.
 * Each status change is immutable and creates a new record.
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
     * Static factory method to create a LessonStatus instance from a database object.
     * @param dbStatus The plain object returned by the database.
     * @returns A new instance of the shared LessonStatus model.
     */
    public static fromDb(dbStatus: {
        id: string;
        lessonId: string;
        status: string;
        context?: JsonValue | null;
        createdAt: Date;
    }): LessonStatus {
        // Validate that the status is a valid LessonStatusValue
        const statusValue = LessonStatus.validateStatus(dbStatus.status);

        // Create and return the shared model instance
        return new LessonStatus({
            id: dbStatus.id,
            lessonId: dbStatus.lessonId,
            status: statusValue,
            context: dbStatus.context || null,
            createdAt: dbStatus.createdAt
        });
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
            [LessonStatusTransition.DEFINE]: LessonStatusValue.DEFINED,
            [LessonStatusTransition.VOID]: LessonStatusValue.VOIDED
        },
        [LessonStatusValue.DEFINED]: {
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
        // Special case for DEFINE
        if (transition === LessonStatusTransition.DEFINE) {
            return 'Define Goals';
        }
        // Simple conversion: Capitalize first letter, rest lowercase
        return transition.charAt(0).toUpperCase() + transition.slice(1).toLowerCase();
    }
}