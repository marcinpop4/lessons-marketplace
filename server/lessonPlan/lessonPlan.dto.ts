import { LessonPlanStatusTransition } from '@shared/models/LessonPlanStatus.js';
import { JsonValue } from '@shared/types/JsonTypes.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateLessonPlanDto:
 *       type: object
 *       description: Data Transfer Object for creating a lesson plan. Lesson ID is optional.
 *       properties:
 *         lessonId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional ID of the lesson this plan is for.
 *         title:
 *           type: string
 *           description: The title of the lesson plan.
 *         description:
 *           type: string
 *           description: A detailed description of the lesson plan.
 *         dueDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Optional overall due date for the lesson plan.
 *       required:
 *         - title
 *         - description
 */
export interface CreateLessonPlanDto {
    lessonId?: string | null;
    title: string;
    description: string;
    dueDate?: Date | null;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateLessonPlanStatusDto:
 *       type: object
 *       properties:
 *         lessonPlanId:
 *           type: string
 *           format: uuid
 *           description: The ID of the lesson plan to update.
 *         transition:
 *           $ref: '#/components/schemas/LessonPlanStatusTransition'
 *         context:
 *           type: object
 *           nullable: true
 *           description: Optional context data for the status change.
 *       required:
 *         - lessonPlanId
 *         - transition
 */
export interface UpdateLessonPlanStatusDto {
    lessonPlanId: string;
    transition: LessonPlanStatusTransition;
    context?: JsonValue | null;
} 