import express, { Router } from 'express';
import { lessonController } from './lesson.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /lessons:
 *   get:
 *     summary: Get lessons (filtered)
 *     description: Fetches lessons. Can be filtered by `teacherId` (Teacher only) or `quoteId` (Student/Teacher of quote).
 *     tags:
 *       - Lessons
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *         required: false
 *         description: ID of the teacher to filter lessons by (only accessible to that teacher).
 *       - in: query
 *         name: quoteId
 *         schema:
 *           type: string
 *         required: false
 *         description: ID of the lesson quote to filter lessons by (accessible to student/teacher of quote).
 *     responses:
 *       '200':
 *         description: List of lessons.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (e.g., trying to access another teacher's lessons).
 */
router.get('/', authMiddleware, lessonController.getLessons);

/**
 * @openapi
 * /lessons:
 *   post:
 *     summary: Create a new lesson
 *     description: Creates a new lesson, typically when a student accepts a quote.
 *     tags:
 *       - Lessons
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonDTO' # Adjust DTO name if needed
 *     responses:
 *       '201':
 *         description: Lesson created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       '400':
 *         description: Bad request (e.g., validation error).
 *       '401':
 *         description: Unauthorized.
 */
router.post('/', authMiddleware, lessonController.createLesson);

/**
 * @openapi
 * /lessons/{id}:
 *   get:
 *     summary: Get a lesson by ID
 *     description: Retrieves the details of a specific lesson.
 *     tags:
 *       - Lessons
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the lesson to retrieve.
 *     responses:
 *       '200':
 *         description: Lesson details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not part of this lesson).
 *       '404':
 *         description: Lesson not found.
 */
router.get('/:id', authMiddleware, lessonController.getLessonById);

/**
 * @openapi
 * /lessons/{lessonId}:
 *   patch:
 *     summary: Update lesson details
 *     description: Allows a teacher to update lesson details, such as its status or assigned milestone.
 *     tags:
 *       - Lessons
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid # Ensure format is uuid for consistency
 *         description: The ID of the lesson to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateLessonDto' # Using the consolidated DTO
 *           example:
 *             milestoneId: "new-milestone-uuid-123"
 *             # transition: "COMPLETE" # Example for status update
 *             # context: { reason: "Completed ahead of schedule" }
 *     responses:
 *       '200':
 *         description: Lesson updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError' # Updated ref
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError' # Updated ref
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError' # Updated ref
 *       '404':
 *         $ref: '#/components/responses/NotFoundError' # Updated ref
 */
router.patch('/:lessonId', authMiddleware, checkRole([UserType.TEACHER]), lessonController.updateLesson);

export default router; 