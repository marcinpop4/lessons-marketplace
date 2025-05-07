import { LessonStatusTransition } from '@shared/models/LessonStatus.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateLessonDTO:
 *       type: object
 *       description: Data Transfer Object for creating a lesson.
 *       properties:
 *         quoteId:
 *           type: string
 *           format: uuid
 *           description: The ID of the accepted lesson quote.
 *       required:
 *         - quoteId
 */
export interface CreateLessonDTO {
    quoteId: string;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateLessonDto:
 *       type: object
 *       description: Data Transfer Object for updating a lesson. Supports status transitions and milestone assignment.
 *       properties:
 *         transition:
 *           $ref: '#/components/schemas/LessonStatusTransition'
 *           description: The status transition to apply to the lesson.
 *         context:
 *           type: object
 *           additionalProperties: true
 *           nullable: true
 *           description: Optional context data for the status change.
 *         milestoneId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: The ID of the milestone to associate with the lesson. Set to null to unassign.
 *       additionalProperties: false # Prevent other properties unless explicitly added
 */
export interface UpdateLessonDto {
    transition?: LessonStatusTransition;
    context?: Record<string, any>;
    milestoneId?: string | null;
    // Add other updatable lesson properties here in the future
} 