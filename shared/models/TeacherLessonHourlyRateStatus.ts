import { TeacherLessonHourlyRate } from './TeacherLessonHourlyRate.js';

// Define allowed status values for a TeacherLessonHourlyRate
/**
 * @openapi
 * components:
 *   schemas:
 *     TeacherLessonHourlyRateStatusValue:
 *       type: string
 *       enum:
 *         - ACTIVE
 *         - INACTIVE
 *       description: Possible status values for a teacher's hourly rate.
 */
export enum TeacherLessonHourlyRateStatusValue {
    ACTIVE = 'ACTIVE',     // The rate is currently active and can be used
    INACTIVE = 'INACTIVE', // The rate has been deactivated and cannot be used
}

// Define allowed transitions between statuses
/**
 * @openapi
 * components:
 *   schemas:
 *     TeacherLessonHourlyRateStatusTransition:
 *       type: string
 *       enum:
 *         - ACTIVATE
 *         - DEACTIVATE
 *       description: Possible transition actions for a teacher's hourly rate status.
 */
export enum TeacherLessonHourlyRateStatusTransition {
    ACTIVATE = 'ACTIVATE',     // Event to make an inactive rate active
    DEACTIVATE = 'DEACTIVATE', // Event to make an active rate inactive
}

// Define the structure for the optional context data
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

// Interface for the properties required to create a status instance
interface TeacherLessonHourlyRateStatusProps {
    id: string;
    rateId: string; // Foreign key to TeacherLessonHourlyRate
    status: TeacherLessonHourlyRateStatusValue;
    context?: JsonValue | null;
    createdAt?: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     TeacherLessonHourlyRateStatus:
 *       type: object
 *       description: Represents a snapshot of a teacher hourly rate's status.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         rateId:
 *           type: string
 *           description: ID of the TeacherLessonHourlyRate this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/TeacherLessonHourlyRateStatusValue'
 *         context:
 *           type: object # Represents JSON
 *           nullable: true
 *           description: Optional context data associated with this status change.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when this status was recorded.
 *         # rate: # Optional relation, maybe exclude from base schema?
 *         #   $ref: '#/components/schemas/TeacherLessonHourlyRate'
 *       required:
 *         - id
 *         - rateId
 *         - status
 *         - createdAt
 */
export class TeacherLessonHourlyRateStatus {
    id: string;
    rateId: string;
    status: TeacherLessonHourlyRateStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    // Relation placeholder (populated by service/mapper)
    rate?: TeacherLessonHourlyRate;

    // --- State Machine Definition ---
    static readonly StatusTransitions = {
        [TeacherLessonHourlyRateStatusValue.ACTIVE]: {
            [TeacherLessonHourlyRateStatusTransition.DEACTIVATE]: TeacherLessonHourlyRateStatusValue.INACTIVE,
        },
        [TeacherLessonHourlyRateStatusValue.INACTIVE]: {
            [TeacherLessonHourlyRateStatusTransition.ACTIVATE]: TeacherLessonHourlyRateStatusValue.ACTIVE,
        },
    } as const; // Use 'as const' for stricter typing

    constructor({
        id,
        rateId,
        status,
        context = null, // Default context to null
        createdAt = new Date(),
    }: TeacherLessonHourlyRateStatusProps) {
        this.id = id;
        this.rateId = rateId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    /**
     * Checks if a transition is valid from the current status.
     * @param currentStatus The current status value.
     * @param transition The requested transition event.
     * @returns True if the transition is valid, false otherwise.
     */
    static isValidTransition(
        currentStatus: TeacherLessonHourlyRateStatusValue,
        transition: TeacherLessonHourlyRateStatusTransition
    ): boolean {
        const allowedTransitions = TeacherLessonHourlyRateStatus.StatusTransitions[currentStatus];
        return !!allowedTransitions && transition in allowedTransitions;
    }

    /**
     * Gets the resulting status after applying a valid transition.
     * @param currentStatus The current status value.
     * @param transition The requested transition event.
     * @returns The resulting status value.
     * @throws Error if the transition is invalid.
     */
    static getResultingStatus(
        currentStatus: TeacherLessonHourlyRateStatusValue,
        transition: TeacherLessonHourlyRateStatusTransition
    ): TeacherLessonHourlyRateStatusValue {
        if (!TeacherLessonHourlyRateStatus.isValidTransition(currentStatus, transition)) {
            throw new Error(`Invalid status transition '${transition}' from status '${currentStatus}'.`);
        }
        // Type assertion needed because TS doesn't fully infer the const assertion mapping here
        return (TeacherLessonHourlyRateStatus.StatusTransitions[currentStatus] as any)[transition];
    }
} 