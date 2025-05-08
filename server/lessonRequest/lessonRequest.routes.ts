import express, { Router } from 'express';
import { lessonRequestController } from './lessonRequest.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /lesson-requests:
 *   post:
 *     summary: Create lesson request (Student only)
 *     description: Allows a student to create a request for a lesson.
 *     tags:
 *       - Lesson Requests
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonRequestDTO' # Adjust DTO name if needed
 *     responses:
 *       '201':
 *         description: Lesson request created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonRequest'
 *       '400':
 *         description: Bad request (e.g., validation error).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not a Student).
 */
router.post('/', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonRequestController.createLessonRequest);

/**
 * @openapi
 * /lesson-requests/{id}:
 *   get:
 *     summary: Get lesson request by ID (Student owner only)
 *     description: Retrieves the details of a specific lesson request, accessible only by the student who created it.
 *     tags:
 *       - Lesson Requests
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the lesson request to retrieve.
 *     responses:
 *       '200':
 *         description: Lesson request details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonRequest'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not the owner of this request).
 *       '404':
 *         description: Lesson request not found.
 */
router.get('/:id', authMiddleware, checkRole([UserType.STUDENT]), lessonRequestController.getLessonRequestById);

/**
 * @openapi
 * /lesson-requests:
 *   get:
 *     summary: Get lesson requests (filtered by student)
 *     description: Retrieves lesson requests, optionally filtered by the `studentId` query parameter. Access might be restricted based on user role (e.g., student sees own, teacher sees related).
 *     tags:
 *       - Lesson Requests
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         required: false
 *         description: The ID of the student whose lesson requests are to be retrieved.
 *     responses:
 *       '200':
 *         description: A list of lesson requests.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonRequest'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User cannot access requests for this student).
 */
// Changed path from /student back to / to handle ?studentId query
router.get('/', authMiddleware, checkRole([UserType.STUDENT]), lessonRequestController.getLessonRequestsByStudent);

export default router; 