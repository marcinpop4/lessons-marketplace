import express, { Router } from 'express';
import { teacherController } from './teacher.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /teachers:
 *   get:
 *     summary: Get teachers (filtered)
 *     description: Retrieves a list of teachers, optionally filtered by lesson type.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - in: query
 *         name: lessonType
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter teachers by the type of lesson they offer.
 *     responses:
 *       '200':
 *         description: A list of teachers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Teacher' # Adjust if needed
 */
router.get('/', teacherController.getTeachers);

/**
 * @openapi
 * /teachers/stats:
 *   get:
 *     summary: Get teacher statistics (Teacher only)
 *     description: Retrieves statistics for the currently authenticated teacher.
 *     tags:
 *       - Teachers
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Teacher statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # Define stats object structure here or use $ref
 *               properties:
 *                 totalLessons: { type: integer }
 *                 averageRating: { type: number }
 *                 # Add other relevant stats
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not a Teacher).
 */
router.get('/stats', authMiddleware, checkRole([UserType.TEACHER]), teacherController.getTeacherStats);

/**
 * @openapi
 * /teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     description: Retrieves the public profile of a specific teacher.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the teacher to retrieve.
 *     responses:
 *       '200':
 *         description: Teacher profile details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Teacher' # Adjust if needed
 *       '404':
 *         description: Teacher not found.
 */
// Note: Added authMiddleware back to require authentication for this route.
// If this should be public, remove authMiddleware and update the test.
router.get('/:id', authMiddleware, teacherController.getTeacherById);

export default router; 