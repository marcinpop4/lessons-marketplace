import { MilestoneStatusTransition } from '@../../shared/models/MilestoneStatus.js';
import { JsonValue } from '../../shared/types/JsonTypes.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateMilestoneDto:
 *       type: object
 *       properties:
 *         lessonPlanId:
 *           type: string
 *           format: uuid
 *           description: The ID of the lesson plan this milestone belongs to.
 *         title:
 *           type: string
 *           description: The title of the milestone.
 *         description:
 *           type: string
 *           description: A detailed description of the milestone.
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: The target due date for completing the milestone.
 *       required:
 *         - lessonPlanId
 *         - title
 *         - description
 *         - dueDate
 */
export interface CreateMilestoneDto {
    lessonPlanId: string;
    title: string;
    description: string;
    dueDate: Date; // Changed to Date type for clarity, validation might be needed
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateMilestoneStatusDto:
 *       type: object
 *       properties:
 *         milestoneId:
 *           type: string
 *           format: uuid
 *           description: The ID of the milestone to update.
 *         transition:
 *           $ref: '#/components/schemas/MilestoneStatusTransition'
 *         context:
 *           type: object
 *           nullable: true
 *           description: Optional context data for the status change.
 *       required:
 *         - milestoneId
 *         - transition
 */
export interface UpdateMilestoneStatusDto {
    milestoneId: string;
    transition: MilestoneStatusTransition;
    context?: JsonValue | null;
} 