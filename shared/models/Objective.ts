import { ObjectiveStatus, ObjectiveStatusValue, ObjectiveStatusTransition } from './ObjectiveStatus.js';
import { Student } from './Student.js';
import { Teacher } from './Teacher.js';
import { LessonType } from './LessonType.js';
import { createChildLogger } from '../../config/logger.js';

const logger = createChildLogger('objective');

/**
 * Database representation of an Objective with its CurrentStatus
 */
export interface DbObjectiveWithStatus {
    id: string;
    studentId: string;
    lessonType: string; // Store as string from enum
    title: string;
    description: string;
    targetDate: Date;
    currentStatusId: string | null;
    currentStatus: {
        id: string;
        objectiveId: string;
        status: string;
        context?: any | null; // Using any for Prisma.JsonValue compatibility
        createdAt: Date;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Properties required to create an Objective instance.
 */
export interface ObjectiveProps {
    id: string;
    studentId: string;
    student?: Student; // Optional Student object relation
    lessonType: LessonType;
    title: string;
    description: string;
    targetDate: Date;
    currentStatusId: string | null;
    currentStatus: ObjectiveStatus; // ObjectiveStatus object
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     Objective:
 *       type: object
 *       description: Represents a student's learning objective for a specific lesson type.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the objective.
 *         studentId:
 *           type: string
 *           description: ID of the student who set this objective.
 *         student:
 *           $ref: '#/components/schemas/Student' # Assuming Student schema exists
 *           description: (Optional) The student object associated with this objective.
 *           nullable: true
 *         lessonType:
 *           $ref: '#/components/schemas/LessonType'
 *         title:
 *           type: string
 *           description: Title of the objective.
 *         description:
 *           type: string
 *           description: Detailed description of the objective.
 *         targetDate:
 *           type: string
 *           format: date-time
 *           description: Target date for achieving the objective.
 *         currentStatus:
 *           $ref: '#/components/schemas/ObjectiveStatus' # Assuming ObjectiveStatus schema exists
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the objective was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the objective was last updated.
 *       required:
 *         - id
 *         - studentId
 *         - lessonType
 *         - title
 *         - description
 *         - targetDate
 *         - currentStatus
 *         - createdAt
 *         - updatedAt
 */
export class Objective implements ObjectiveProps {
    id: string;
    studentId: string;
    student?: Student; // Optional relation
    lessonType: LessonType;
    title: string;
    description: string;
    targetDate: Date;
    currentStatusId: string | null;
    currentStatus: ObjectiveStatus;
    createdAt: Date;
    updatedAt: Date;

    constructor(props: ObjectiveProps) {
        this.id = props.id;
        this.studentId = props.studentId;
        this.student = props.student;
        this.lessonType = props.lessonType;
        this.title = props.title;
        this.description = props.description;
        this.targetDate = props.targetDate;
        this.currentStatusId = props.currentStatusId ?? null;

        // Ensure currentStatus is a valid ObjectiveStatus instance
        if (!props.currentStatus || !(props.currentStatus instanceof ObjectiveStatus)) {
            logger.warn('Invalid or missing currentStatus prop in Objective constructor, defaulting to CREATED', { props });
            // Create a default CREATED status if none is provided or invalid
            this.currentStatus = new ObjectiveStatus({
                id: props.currentStatusId || 'temp-id-' + Date.now(), // Generate a temporary ID if needed
                objectiveId: props.id,
                status: ObjectiveStatusValue.CREATED,
                createdAt: new Date()
            });
            // Update currentStatusId if it was null and we created a status
            if (!this.currentStatusId) {
                this.currentStatusId = this.currentStatus.id;
            }
        } else {
            this.currentStatus = props.currentStatus;
            // Ensure currentStatusId matches the provided currentStatus object's ID
            if (this.currentStatusId !== this.currentStatus.id) {
                logger.warn('Mismatch between currentStatusId and currentStatus.id in Objective constructor', {
                    currentStatusId: this.currentStatusId,
                    currentStatusObjectId: this.currentStatus.id
                });
                this.currentStatusId = this.currentStatus.id;
            }
        }

        this.createdAt = props.createdAt ?? new Date();
        this.updatedAt = props.updatedAt ?? new Date();

        // Validate LessonType
        if (!Object.values(LessonType).includes(props.lessonType)) {
            logger.error('Invalid lessonType provided in Objective constructor', { lessonType: props.lessonType });
            throw new Error(`Invalid lessonType: ${props.lessonType}`);
        }
    }

    /**
    * Basic check to see if the objective is considered active (not abandoned or achieved).
    */
    isActive(): boolean {
        return this.currentStatus.status !== ObjectiveStatusValue.ABANDONED &&
            this.currentStatus.status !== ObjectiveStatusValue.ACHIEVED;
    }
} 