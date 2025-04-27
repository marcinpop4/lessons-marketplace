import express, { Router } from 'express';
import { studentController } from './student.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /students:
 *   post:
 *     summary: Create student profile (Student only)
 *     description: Creates a student profile linked to the authenticated user.
 *     tags:
 *       - Students
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStudentDTO' # Adjust DTO name if needed
 *     responses:
 *       '201':
 *         description: Student profile created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student' # Adjust schema name if needed
 *       '400':
 *         description: Bad request (e.g., validation error, profile already exists).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not a Student).
 */
router.post('/', authMiddleware, checkRole([UserType.STUDENT]), studentController.createStudent);

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     summary: Get student by ID
 *     description: Retrieves the details of a specific student. (Access control might be needed).
 *     tags:
 *       - Students
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the student to retrieve.
 *     responses:
 *       '200':
 *         description: Student details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student' # Adjust schema name if needed
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden.
 *       '404':
 *         description: Student not found.
 */
router.get('/:id', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), studentController.getStudentById);

// Add other student routes here (e.g., GET /:id if needed, likely authenticated)

export default router; 