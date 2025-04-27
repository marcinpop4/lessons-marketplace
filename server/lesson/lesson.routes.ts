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
router.get('/', authMiddleware, lessonController.getLessons as any);

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
 *     summary: Update lesson status (Teacher only)
 *     description: Allows a teacher to update the status of a lesson (e.g., mark as completed).
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
 *         description: The ID of the lesson to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/LessonStatus' # Adjust schema ref if needed
 *             required:
 *               - status
 *     responses:
 *       '200':
 *         description: Lesson status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       '400':
 *         description: Bad request (e.g., invalid status).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not the teacher of this lesson).
 *       '404':
 *         description: Lesson not found.
 */
router.patch('/:lessonId', authMiddleware, checkRole([UserType.TEACHER]), lessonController.updateLessonStatus);

export default router; 