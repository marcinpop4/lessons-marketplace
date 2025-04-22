import express, { Router } from 'express';
import { studentController } from './student.controller.js';

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/students:
 *   post:
 *     summary: Create a new student
 *     description: Creates a new student record. Typically handled by registration, but exposed here.
 *     tags: [Students]
 *     security: [] # No authentication required for creation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string, example: 'Test' }
 *               lastName: { type: string, example: 'Student' }
 *               email: { type: string, format: email, example: 'test.student.new@example.com' }
 *               password: { type: string, format: password, example: 'password123' }
 *               phoneNumber: { type: string, example: '111-222-3333' }
 *               dateOfBirth: { type: string, format: date, example: '2005-06-07' }
 *             required: [firstName, lastName, email, password, phoneNumber, dateOfBirth]
 *     responses:
 *       201:
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student' # Assuming a Student schema exists, excluding password
 *       400:
 *         description: Bad Request (e.g., missing fields, invalid data)
 *       409:
 *         description: Conflict (e.g., email already exists)
 *       500:
 *         description: Internal Server Error
 */
router.post('/', studentController.createStudent);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   get:
 *     summary: Get student details by ID
 *     description: Retrieves detailed information about a specific student.
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The student's unique identifier
 *     responses:
 *       200:
 *         description: Student details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:id', studentController.getStudentById);

// Add other student routes here (e.g., GET /:id if needed, likely authenticated)

export default router; 