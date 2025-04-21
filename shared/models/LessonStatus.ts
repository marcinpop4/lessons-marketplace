import { JsonValue } from '@prisma/client/runtime/library';

/**
 * Possible status values for a lesson
 */
export enum LessonStatusValue {
    REQUESTED = 'REQUESTED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
    VOIDED = 'VOIDED'
}

/**
 * Defines the possible transition actions that can be taken
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
 * Represents a status change for a lesson
 * Each status change is immutable and creates a new record
 */
export class LessonStatus {
    id: string;
    lessonId: string;
    status: LessonStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    // Updated constructor using object destructuring
    constructor({
        id,
        lessonId,
        status,
        context = null, // Default value for optional prop
        createdAt = new Date() // Default value for optional prop
    }: LessonStatusProps) {
        this.id = id;
        this.lessonId = lessonId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    /**
     * Create a new LessonStatus record
     * @param id Unique identifier for the status record
     * @param lessonId The ID of the lesson this status belongs to
     * @param status The new status value
     * @param context Additional context about the status change (optional)
     * @returns A new LessonStatus instance
     */
    static create(
        id: string,
        lessonId: string,
        status: LessonStatusValue,
        context: JsonValue | null = null
    ): LessonStatus {
        // Use the new constructor pattern
        return new LessonStatus({ id, lessonId, status, context });
    }

    /**
     * Defines valid status transitions and their results
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
     * Gets the resulting status after a transition
     * @param currentStatus The current status of the lesson
     * @param transition The requested transition
     * @returns The resulting status if valid, undefined otherwise
     */
    static getResultingStatus(currentStatus: LessonStatusValue, transition: LessonStatusTransition): LessonStatusValue | undefined {
        const possibleTransitions = LessonStatus.StatusTransitions[currentStatus];
        if (transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    /**
     * Validates if a transition from a current status to a new status is allowed.
     * @param currentStatus The current status of the lesson.
     * @param transition The requested transition.
     * @returns True if the transition is valid, false otherwise.
     */
    static isValidTransition(currentStatus: LessonStatusValue, transition: LessonStatusTransition): boolean {
        const possibleTransitions = LessonStatus.StatusTransitions[currentStatus];
        return transition in possibleTransitions;
    }
}