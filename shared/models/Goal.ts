import { GoalStatus, GoalStatusValue } from './GoalStatus.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     Goal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the goal.
 *         lessonId:
 *           type: string
 *           description: ID of the lesson this goal belongs to.
 *         title:
 *           type: string
 *           description: Title of the goal.
 *         description:
 *           type: string
 *           description: Detailed description of the goal.
 *         estimatedLessonCount:
 *           type: integer
 *           description: Estimated number of lessons to achieve this goal.
 *           example: 5
 *         currentStatus:
 *           $ref: '#/components/schemas/GoalStatus' # Refers to the GoalStatus schema
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the goal was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the goal was last updated.
 *       required:
 *         - id
 *         - lessonId
 *         - title
 *         - description
 *         - estimatedLessonCount
 *         - currentStatus
 *         - createdAt
 *         - updatedAt
 */

/**
 * Database representation of a Goal with CurrentStatus
 */
export interface DbGoalWithStatus {
    id: string;
    lessonId: string;
    title: string;
    description: string;
    estimatedLessonCount: number;
    currentStatusId: string | null;
    currentStatus: {
        id: string;
        goalId: string;
        status: string;
        context?: any | null;
        createdAt: Date;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Properties required to create a Goal instance.
 */
export interface GoalProps {
    id: string;
    lessonId: string; // Foreign key linking to the Lesson
    title: string; // Title is now required
    description: string;
    estimatedLessonCount: number; // Required estimate of lessons needed
    currentStatusId: string | null; // Can be null initially
    currentStatus: GoalStatus; // Changed type to GoalStatus object
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Goal model representing a specific objective or target for a music lesson.
 */
export class Goal implements GoalProps {
    id: string;
    lessonId: string;
    title: string; // Title is now required
    description: string;
    estimatedLessonCount: number; // Required estimate
    currentStatusId: string | null;
    currentStatus: GoalStatus; // Changed type to GoalStatus object
    createdAt: Date;
    updatedAt: Date;

    constructor(props: GoalProps) {
        this.id = props.id;
        this.lessonId = props.lessonId;
        this.title = props.title;
        this.description = props.description;
        this.estimatedLessonCount = props.estimatedLessonCount;
        this.currentStatusId = props.currentStatusId ?? null;
        if (!props.currentStatus || !(props.currentStatus instanceof GoalStatus)) {
            console.warn("Goal constructor received invalid currentStatus prop", props);
            this.currentStatus = new GoalStatus({
                id: props.currentStatusId || 'unknown',
                goalId: props.id,
                status: GoalStatusValue.CREATED,
                createdAt: new Date()
            });
        } else {
            this.currentStatus = props.currentStatus;
        }
        this.createdAt = props.createdAt ?? new Date();
        this.updatedAt = props.updatedAt ?? new Date();
    }
} 