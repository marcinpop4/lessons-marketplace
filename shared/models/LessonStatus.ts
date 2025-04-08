import { JsonValue } from '@prisma/client';

/**
 * Possible status values for a lesson
 */
export enum LessonStatusValue {
    REQUESTED = 'REQUESTED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    STARTED = 'STARTED',
    COMPLETED = 'COMPLETED',
    INCOMPLETE = 'INCOMPLETE'
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

    constructor(
        id: string,
        lessonId: string,
        status: LessonStatusValue,
        context: JsonValue | null = null,
        createdAt: Date = new Date()
    ) {
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
        return new LessonStatus(id, lessonId, status, context);
    }
} 