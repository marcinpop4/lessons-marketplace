// Simple local logger to avoid import complexity
const createLocalLogger = (component: string) => ({
    warn: (message: string, context?: any) => {
        console.warn(`[${component}] ${message}`, context || '');
    }
});

const logger = createLocalLogger('milestone-status');

// Define a JSON value type
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * @openapi
 * components:
 *   schemas:
 *     MilestoneStatusValue:
 *       type: string
 *       enum:
 *         - CREATED
 *         - IN_PROGRESS
 *         - COMPLETED
 *         - CANCELLED
 *       description: Possible status values for a milestone.
 */
export enum MilestoneStatusValue {
    CREATED = 'CREATED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * @openapi
 * components:
 *   schemas:
 *     MilestoneStatusTransition:
 *       type: string
 *       enum:
 *         - START_PROGRESS
 *         - MARK_COMPLETED
 *         - CANCEL_MILESTONE
 *         - RESET_TO_CREATED
 *       description: Possible transition actions for a milestone status.
 */
export enum MilestoneStatusTransition {
    START_PROGRESS = 'START_PROGRESS',
    MARK_COMPLETED = 'MARK_COMPLETED',
    CANCEL_MILESTONE = 'CANCEL_MILESTONE',
    RESET_TO_CREATED = 'RESET_TO_CREATED',
}

/**
 * Properties required to create a MilestoneStatus instance.
 */
interface MilestoneStatusProps {
    id: string;
    milestoneId: string;
    status: MilestoneStatusValue;
    context?: JsonValue | null;
    createdAt?: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     MilestoneStatus:
 *       type: object
 *       description: Represents a snapshot of a milestone's status at a point in time.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the status record.
 *         milestoneId:
 *           type: string
 *           description: ID of the milestone this status belongs to.
 *         status:
 *           $ref: '#/components/schemas/MilestoneStatusValue'
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
 *         - milestoneId
 *         - status
 *         - createdAt
 */
export class MilestoneStatus {
    id: string;
    milestoneId: string;
    status: MilestoneStatusValue;
    context: JsonValue | null;
    createdAt: Date;

    constructor({
        id,
        milestoneId,
        status,
        context = null,
        createdAt = new Date()
    }: MilestoneStatusProps) {
        this.id = id;
        this.milestoneId = milestoneId;
        this.status = status;
        this.context = context;
        this.createdAt = createdAt;
    }

    static create(
        id: string,
        milestoneId: string,
        status: MilestoneStatusValue,
        context: JsonValue | null = null
    ): MilestoneStatus {
        return new MilestoneStatus({ id, milestoneId, status, context });
    }

    static validateStatus(status: string): MilestoneStatusValue {
        if (Object.values(MilestoneStatusValue).includes(status as MilestoneStatusValue)) {
            return status as MilestoneStatusValue;
        }
        throw new Error(`Invalid milestone status value: ${status}`);
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
                logger.warn('Failed to parse MilestoneStatus context as JSON', { error: e, context: this.context });
                return this.context;
            }
        }
        return this.context;
    }

    static getDisplayLabelForStatus(status: MilestoneStatusValue): string {
        if (!status) return 'Unknown Status';
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    static readonly StatusTransitions = {
        [MilestoneStatusValue.CREATED]: {
            [MilestoneStatusTransition.START_PROGRESS]: MilestoneStatusValue.IN_PROGRESS,
            [MilestoneStatusTransition.CANCEL_MILESTONE]: MilestoneStatusValue.CANCELLED,
        },
        [MilestoneStatusValue.IN_PROGRESS]: {
            [MilestoneStatusTransition.MARK_COMPLETED]: MilestoneStatusValue.COMPLETED,
            [MilestoneStatusTransition.CANCEL_MILESTONE]: MilestoneStatusValue.CANCELLED,
            [MilestoneStatusTransition.RESET_TO_CREATED]: MilestoneStatusValue.CREATED,
        },
        [MilestoneStatusValue.COMPLETED]: {
            // May allow RESET_TO_TODO or similar if re-opening is needed
            [MilestoneStatusTransition.CANCEL_MILESTONE]: MilestoneStatusValue.CANCELLED, // e.g. if plan is cancelled
        },
        [MilestoneStatusValue.CANCELLED]: {
            // No transitions out of CANCELLED
        }
    } as const;

    static getResultingStatus(currentStatus: MilestoneStatusValue, transition: MilestoneStatusTransition): MilestoneStatusValue | undefined {
        const possibleTransitions = MilestoneStatus.StatusTransitions[currentStatus];
        if (possibleTransitions && transition in possibleTransitions) {
            return possibleTransitions[transition as keyof typeof possibleTransitions];
        }
        return undefined;
    }

    static isValidTransition(currentStatus: MilestoneStatusValue, transition: MilestoneStatusTransition): boolean {
        const possibleTransitions = MilestoneStatus.StatusTransitions[currentStatus];
        return !!possibleTransitions && transition in possibleTransitions;
    }

    static getDisplayLabelForTransition(transition: MilestoneStatusTransition): string {
        if (!transition) return 'Unknown Action';
        return transition
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    static getValidTransitionsForStatus(currentStatus: MilestoneStatusValue): MilestoneStatusTransition[] {
        const possibleTransitionsObject = MilestoneStatus.StatusTransitions[currentStatus];
        if (!possibleTransitionsObject) {
            return [];
        }
        const validTransitions: MilestoneStatusTransition[] = [];
        for (const key in possibleTransitionsObject) {
            if (Object.prototype.hasOwnProperty.call(MilestoneStatusTransition, key)) {
                validTransitions.push(MilestoneStatusTransition[key as keyof typeof MilestoneStatusTransition]);
            }
        }
        return validTransitions;
    }
} 