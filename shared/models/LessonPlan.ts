import { Milestone } from './Milestone.js';
import { LessonPlanStatus, LessonPlanStatusValue } from './LessonPlanStatus.js';
import { Lesson } from './Lesson.js'; // Added import for Lesson

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonPlan:
 *       type: object
 *       description: Represents a lesson plan created by a teacher, potentially associated with a specific lesson.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the lesson plan.
 *         lessonId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional ID of the lesson this plan is associated with.
 *         title:
 *           type: string
 *           description: Title of the lesson plan.
 *         description:
 *           type: string
 *           description: Detailed description of the lesson plan.
 *         dueDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Optional overall due date for the lesson plan.
 *         currentStatus:
 *           $ref: '#/components/schemas/LessonPlanStatus'
 *           nullable: true
 *         statuses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LessonPlanStatus'
 *           description: History of status changes for this lesson plan.
 *         milestones:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Milestone'
 *           description: Milestones associated with this lesson plan.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the lesson plan was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the lesson plan was last updated.
 *       required:
 *         - id
 *         - title
 *         - description
 *         - statuses
 *         - createdAt
 *         - updatedAt
 */

export interface LessonPlanProps {
    id: string;
    lessonId?: string | null; // Make optional and nullable
    title: string;
    description: string;
    dueDate?: Date | null;
    currentStatusId?: string | null;
    currentStatus?: LessonPlanStatus | null;
    statuses?: LessonPlanStatus[];
    milestones?: Milestone[];
    createdAt?: Date;
    updatedAt?: Date;
}

export class LessonPlan implements LessonPlanProps {
    id: string;
    lessonId: string | null; // Make nullable
    title: string;
    description: string;
    dueDate: Date | null;
    currentStatusId: string | null;
    currentStatus: LessonPlanStatus | null;
    statuses: LessonPlanStatus[];
    milestones: Milestone[];
    createdAt: Date;
    updatedAt: Date;

    constructor({
        id,
        lessonId = null, // Default to null
        title,
        description,
        dueDate = null,
        currentStatusId = null,
        currentStatus = null,
        statuses = [],
        milestones = [],
        createdAt = new Date(),
        updatedAt = new Date(),
    }: LessonPlanProps) {
        this.id = id;
        this.lessonId = lessonId;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.currentStatusId = currentStatusId;
        this.currentStatus = currentStatus;
        this.statuses = statuses;
        this.milestones = milestones;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Example method to add a milestone
    addMilestone(milestone: Milestone): void {
        this.milestones.push(milestone);
        // Potentially update overall plan dueDate based on milestones
    }

    // Static method to create a LessonPlan with an initial DRAFT status
    static createDraft(
        id: string,
        title: string,
        description: string,
        initialStatusId: string,
        lessonId?: string | null, // Make lessonId optional
        dueDate?: Date | null
    ): LessonPlan {
        const initialStatus = new LessonPlanStatus({
            id: initialStatusId,
            lessonPlanId: id,
            status: LessonPlanStatusValue.DRAFT,
        });

        return new LessonPlan({
            id,
            lessonId: lessonId ?? null, // Assign null if undefined/null
            title,
            description,
            dueDate,
            currentStatusId: initialStatus.id,
            currentStatus: initialStatus,
            statuses: [initialStatus],
        });
    }
} 