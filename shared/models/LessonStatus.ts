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
     * Validates if a transition from a current status to a new status is allowed.
     * @param currentStatus The current status of the lesson.
     * @param newStatus The desired new status.
     * @returns True if the transition is valid, false otherwise.
     */
    static isValidTransition(currentStatus: LessonStatusValue, newStatus: LessonStatusValue): boolean {
        if (currentStatus === newStatus) {
            // Handled as no-op by controller, considered valid here for completeness
            return true;
        }

        switch (currentStatus) {
            case LessonStatusValue.REQUESTED:
                return [LessonStatusValue.ACCEPTED, LessonStatusValue.REJECTED].includes(newStatus);
            case LessonStatusValue.ACCEPTED:
                // Allowing REJECTED from ACCEPTED as discussed
                return [LessonStatusValue.COMPLETED, LessonStatusValue.VOIDED, LessonStatusValue.REJECTED].includes(newStatus);
            case LessonStatusValue.REJECTED:
            case LessonStatusValue.COMPLETED:
            case LessonStatusValue.VOIDED:
                return false; // Terminal states
            default:
                // Should not happen with valid enum values, treat as invalid
                console.error(`Unexpected currentStatus: ${currentStatus}`);
                return false;
        }
    }
}