// Using a generic JsonValue type to avoid direct Prisma dependency in shared models
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * Possible status values for a lesson quote.
 */
export enum LessonQuoteStatusValue {
    CREATED = 'CREATED',     // Quote has been generated but not acted upon.
    ACCEPTED = 'ACCEPTED',   // Student accepted the quote, leading to lesson creation.
    REJECTED = 'REJECTED',   // Student rejected the quote.
    // Future Possibility: EXPIRED = 'EXPIRED', // If quotes have a time limit
}

/**
 * Defines the possible transition actions that can be taken on a lesson quote.
 */
export enum LessonQuoteStatusTransition {
    ACCEPT = 'ACCEPT',     // Student accepts the quote.
    REJECT = 'REJECT',     // Student rejects the quote.
    // Future Possibility: EXPIRE = 'EXPIRE'   // Action to mark a quote as expired
}

/**
 * Properties required to create a LessonQuoteStatus instance.
 */
interface LessonQuoteStatusProps {
    id: string;
    lessonQuoteId: string;
    status: LessonQuoteStatusValue;
    context?: JsonValue | null; // Optional context (e.g., reason for rejection)
    createdAt?: Date;          // Optional, defaults to new Date()
}

/**
 * Represents a status change for a lesson quote.
 */
export class LessonQuoteStatus {
    id: string;
    lessonQuoteId: string;
    status: LessonQuoteStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        lessonQuoteId,
        status,
        context = null,
        createdAt = new Date()
    }: LessonQuoteStatusProps) {
        this.id = id;
        this.lessonQuoteId = lessonQuoteId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;

        if (!Object.values(LessonQuoteStatusValue).includes(status)) {
            console.error(`[LessonQuoteStatus Constructor] Invalid status value: ${status}`);
            throw new Error(`Invalid status value: ${status}`);
        }
    }

    /**
     * Defines valid status transitions and their results.
     */
    static readonly StatusTransitions = {
        [LessonQuoteStatusValue.CREATED]: {
            [LessonQuoteStatusTransition.ACCEPT]: LessonQuoteStatusValue.ACCEPTED,
            [LessonQuoteStatusTransition.REJECT]: LessonQuoteStatusValue.REJECTED,
            // [LessonQuoteStatusTransition.EXPIRE]: LessonQuoteStatusValue.EXPIRED // Example if expiry added
        },
        // No transitions out of terminal states
        [LessonQuoteStatusValue.ACCEPTED]: {},
        [LessonQuoteStatusValue.REJECTED]: {},
        // [LessonQuoteStatusValue.EXPIRED]: {}
    } as const;

    /**
     * Gets the resulting status after a transition.
     */
    static getResultingStatus(currentStatus: LessonQuoteStatusValue, transition: LessonQuoteStatusTransition): LessonQuoteStatusValue | undefined {
        const possibleTransitions = LessonQuoteStatus.StatusTransitions[currentStatus];
        if (possibleTransitions && transition in possibleTransitions) {
            // Use type assertion safely due to the `as const` on StatusTransitions
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    /**
     * Validates if a transition is allowed from the current status.
     */
    static isValidTransition(currentStatus: LessonQuoteStatusValue, transition: LessonQuoteStatusTransition): boolean {
        const possibleTransitions = LessonQuoteStatus.StatusTransitions[currentStatus];
        // Check if the currentStatus exists as a key and if the transition exists as a key within that status's transitions
        return !!possibleTransitions && (transition in possibleTransitions);
    }
} 