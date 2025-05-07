import { Lesson } from './Lesson.js';
import { MilestoneStatus, MilestoneStatusValue } from './MilestoneStatus.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     Milestone:
 *       type: object
 *       description: Represents a milestone within a lesson plan.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the milestone.
 *         lessonPlanId:
 *           type: string
 *           format: uuid
 *           description: ID of the lesson plan this milestone belongs to.
 *         title:
 *           type: string
 *           description: Title of the milestone.
 *         description:
 *           type: string
 *           description: Detailed description of the milestone.
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Due date for the milestone.
 *         currentStatus:
 *           $ref: '#/components/schemas/MilestoneStatus'
 *           nullable: true
 *         statuses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MilestoneStatus'
 *           description: History of status changes for this milestone.
 *         lessons:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Lesson'
 *           description: Lessons associated with this milestone.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the milestone was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the milestone was last updated.
 *       required:
 *         - id
 *         - lessonPlanId
 *         - title
 *         - description
 *         - dueDate
 *         - statuses
 *         - createdAt
 *         - updatedAt
 */

export interface MilestoneProps {
    id: string;
    lessonPlanId: string;
    title: string;
    description: string;
    dueDate: Date;
    currentStatusId?: string | null;
    currentStatus?: MilestoneStatus | null;
    statuses?: MilestoneStatus[];
    lessons?: Lesson[];
    createdAt?: Date;
    updatedAt?: Date;
}

export class Milestone implements MilestoneProps {
    id: string;
    lessonPlanId: string;
    title: string;
    description: string;
    dueDate: Date;
    currentStatusId: string | null;
    currentStatus: MilestoneStatus | null;
    statuses: MilestoneStatus[];
    lessons: Lesson[];
    createdAt: Date;
    updatedAt: Date;

    constructor({
        id,
        lessonPlanId,
        title,
        description,
        dueDate,
        currentStatusId = null,
        currentStatus = null,
        statuses = [],
        lessons = [],
        createdAt = new Date(),
        updatedAt = new Date(),
    }: MilestoneProps) {
        this.id = id;
        this.lessonPlanId = lessonPlanId;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.currentStatusId = currentStatusId;
        this.currentStatus = currentStatus;
        this.statuses = statuses;
        this.lessons = lessons;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Future methods can be added here, e.g.:
    // addLesson(lesson: Lesson)
    // removeLesson(lessonId: string)
    // static createInitial(id: string, lessonPlanId: string, title: string, description: string, dueDate: Date, initialStatusId: string): Milestone
} 