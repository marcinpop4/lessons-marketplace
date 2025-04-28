import { LessonType } from './LessonType.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     ObjectiveRecommendation:
 *       type: object
 *       description: Represents an AI-generated recommendation for a student objective.
 *       properties:
 *         title:
 *           type: string
 *           description: The suggested title for the objective.
 *         description:
 *           type: string
 *           description: The suggested description for the objective.
 *         lessonType:
 *           $ref: '#/components/schemas/LessonType'
 *           nullable: true
 *           description: The lesson type this objective might relate to (optional).
 *         targetDate:
 *           type: string
 *           format: date # YYYY-MM-DD format
 *           description: A suggested target date for the objective.
 *         difficulty:
 *            type: string
 *            enum: [Beginner, Intermediate, Advanced]
 *            description: Suggested difficulty level for the objective.
 *       required:
 *         - title
 *         - description
 *         - targetDate # Making targetDate required for a suggestion
 *         - difficulty # Added difficulty as required
 */
export interface ObjectiveRecommendation {
    title: string;
    description: string;
    lessonType: LessonType | null; // Can be null if not specific
    targetDate: string; // Expecting YYYY-MM-DD string format from AI
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; // Added difficulty field
} 