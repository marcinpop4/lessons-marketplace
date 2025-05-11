import { Router } from 'express';
import { lessonSummaryController } from './lessonSummary.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router = Router();

/**
 * @openapi
 * /summary:
 *   post:
 *     tags:
 *       - Lesson Summaries
 *     summary: Create a summary for a specific lesson
 *     description: Creates a new summary (including homework) for a completed lesson. lessonId is now in the request body.
 *     security:
 *       - bearerAuth: []
 *     parameters: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonSummaryDto'
 *           example:
 *             lessonId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *             summary: "Sarah made excellent progress on her G major scales today, playing them consistently at 80 bpm. We also worked on the new song 'Wonderwall,' and she can play the verse chords smoothly. She struggled a bit with the timing of the pre-chorus chord changes."
 *             homework: "Practice G major scale for 10 minutes daily. Work on the pre-chorus of 'Wonderwall,' focusing on clean transitions between Am, G, and C. Aim to play the full verse and pre-chorus together by next week."
 *     responses:
 *       201:
 *         description: Lesson summary created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonSummary'
 *       400:
 *         description: Bad Request (e.g., invalid input, lesson not completed, summary already exists).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (e.g., user not authenticated).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (e.g., user not authorized to create a summary for this lesson).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Lesson not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/',
    authMiddleware,
    checkRole([UserType.TEACHER]),
    lessonSummaryController.create
);

// Define DTO and Model schemas for OpenAPI documentation
/**
 * @openapi
 * components:
 *   schemas:
 *     CreateLessonSummaryDto:
 *       type: object
 *       properties:
 *         lessonId:
 *           type: string
 *           format: uuid
 *           description: The ID of the lesson for which the summary is being created.
 *         summary:
 *           type: string
 *           description: The summary of the lesson.
 *           minLength: 10
 *           maxLength: 5000
 *         homework:
 *           type: string
 *           description: Homework assigned for the lesson.
 *           minLength: 5
 *           maxLength: 2000
 *       required:
 *         - lessonId
 *         - summary
 *         - homework
 *     LessonSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         lessonId:
 *           type: string
 *           format: uuid
 *         summary:
 *           type: string
 *         homework:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router; 