import { createChildLogger } from '../../server/config/logger.js';

const logger = createChildLogger('lesson-plan-status');

// Define a JSON value type
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonPlanStatusValue:
 *       type: string
 *       enum:
 *         - DRAFT
 *         - PENDING_APPROVAL
 *         - ACTIVE
 *         - COMPLETED
 *         - CANCELLED
 *         - REJECTED
 *       description: Possible status values for a lesson plan.
 */
export enum LessonPlanStatusValue {
    DRAFT = 'DRAFT',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REJECTED = 'REJECTED',
}

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonPlanStatusTransition:
 *       type: string
 *       enum:
 *         - SUBMIT_FOR_APPROVAL
 *         - APPROVE
 *         - REJECT
 *         - REVISE
 *         - COMPLETE_PLAN
 *         - CANCEL_PLAN
 *       description: Possible transition actions for a lesson plan status.
 */
export enum LessonPlanStatusTransition {
    SUBMIT_FOR_APPROVAL = 'SUBMIT_FOR_APPROVAL',
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
    REVISE = 'REVISE',
    COMPLETE_PLAN = 'COMPLETE_PLAN',
    CANCEL_PLAN = 'CANCEL_PLAN',
}

/**
 * Properties required to create a LessonPlanStatus instance.
 */
interface LessonPlanStatusProps {
    id: string;
    lessonPlanId: string;
    status: LessonPlanStatusValue;
    context?: JsonValue | null;
    createdAt?: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonPlanStatus:
 *       type: object
 *       description: Represents a snapshot of a lesson plan's status at a point in time.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         lessonPlanId:
 *           type: string
 *           description: ID of the lesson plan this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/LessonPlanStatusValue'
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
 *         - lessonPlanId
 *         - status
 *         - createdAt
 */
export class LessonPlanStatus {
    id: string;
    lessonPlanId: string;
    status: LessonPlanStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        lessonPlanId,
        status,
        context = null,
        createdAt = new Date()
    }: LessonPlanStatusProps) {
        this.id = id;
        this.lessonPlanId = lessonPlanId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    /**
     * Create a new LessonPlanStatus record.
     */
    static create(
        id: string,
        lessonPlanId: string,
        status: LessonPlanStatusValue,
        context: JsonValue | null = null
    ): LessonPlanStatus {
        return new LessonPlanStatus({ id, lessonPlanId, status, context });
    }

    /**
     * Validates a status string and ensures it's a valid LessonPlanStatusValue.
     * Throws an error if the status is invalid.
     * @param status Status string to validate
     * @returns The validated LessonPlanStatusValue enum value
     */
    static validateStatus(status: string): LessonPlanStatusValue {
        if (Object.values(LessonPlanStatusValue).includes(status as LessonPlanStatusValue)) {
            return status as LessonPlanStatusValue;
        }
        throw new Error(`Invalid lesson plan status value: ${status}`);
    }

    getContext(): JsonValue | null {
        if (this.context === null) {
            return null;
        }
        if (typeof this.context === 'object') {
            return this.context;
        }
        if (typeof this.context === 'string') {
            try {
                return JSON.parse(this.context);
            } catch (e) {
                logger.warn('Failed to parse LessonPlanStatus context as JSON', { error: e, context: this.context });
                return this.context;
            }
        }
        return this.context;
    }

    static getDisplayLabelForStatus(status: LessonPlanStatusValue): string {
        if (!status) return 'Unknown Status';
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    static readonly StatusTransitions = {
        [LessonPlanStatusValue.DRAFT]: {
            [LessonPlanStatusTransition.SUBMIT_FOR_APPROVAL]: LessonPlanStatusValue.PENDING_APPROVAL,
            [LessonPlanStatusTransition.CANCEL_PLAN]: LessonPlanStatusValue.CANCELLED,
        },
        [LessonPlanStatusValue.PENDING_APPROVAL]: {
            [LessonPlanStatusTransition.APPROVE]: LessonPlanStatusValue.ACTIVE,
            [LessonPlanStatusTransition.REJECT]: LessonPlanStatusValue.REJECTED,
            [LessonPlanStatusTransition.REVISE]: LessonPlanStatusValue.DRAFT,
            [LessonPlanStatusTransition.CANCEL_PLAN]: LessonPlanStatusValue.CANCELLED,
        },
        [LessonPlanStatusValue.ACTIVE]: {
            [LessonPlanStatusTransition.COMPLETE_PLAN]: LessonPlanStatusValue.COMPLETED,
            [LessonPlanStatusTransition.CANCEL_PLAN]: LessonPlanStatusValue.CANCELLED,
        },
        [LessonPlanStatusValue.REJECTED]: {
            [LessonPlanStatusTransition.REVISE]: LessonPlanStatusValue.DRAFT,
            [LessonPlanStatusTransition.CANCEL_PLAN]: LessonPlanStatusValue.CANCELLED,
        },
        [LessonPlanStatusValue.COMPLETED]: {
            // No transitions out of COMPLETED except perhaps a VOID or ARCHIVE later
        },
        [LessonPlanStatusValue.CANCELLED]: {
            // No transitions out of CANCELLED
        }
    } as const;

    static getResultingStatus(currentStatus: LessonPlanStatusValue, transition: LessonPlanStatusTransition): LessonPlanStatusValue | undefined {
        const possibleTransitions = LessonPlanStatus.StatusTransitions[currentStatus];
        if (possibleTransitions && transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    static isValidTransition(currentStatus: LessonPlanStatusValue, transition: LessonPlanStatusTransition): boolean {
        const possibleTransitions = LessonPlanStatus.StatusTransitions[currentStatus];
        return !!possibleTransitions && transition in possibleTransitions;
    }

    static getDisplayLabelForTransition(transition: LessonPlanStatusTransition): string {
        if (!transition) return 'Unknown Action';
        return transition
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    static getValidTransitionsForStatus(currentStatus: LessonPlanStatusValue): LessonPlanStatusTransition[] {
        const possibleTransitionsObject = LessonPlanStatus.StatusTransitions[currentStatus];
        if (!possibleTransitionsObject) {
            return [];
        }
        const validTransitions: LessonPlanStatusTransition[] = [];
        for (const key in possibleTransitionsObject) {
            if (Object.prototype.hasOwnProperty.call(LessonPlanStatusTransition, key)) {
                validTransitions.push(LessonPlanStatusTransition[key as keyof typeof LessonPlanStatusTransition]);
            }
        }
        return validTransitions;
    }
} 