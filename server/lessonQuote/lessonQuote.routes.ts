import express, { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { lessonQuoteController } from './lessonQuote.controller.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /lesson-quotes:
 *   post:
 *     summary: Create lesson quotes for a request
 *     description: Allows an authenticated student to request the generation of lesson quotes for their lesson request. Optionally, specific teachers can be requested.
 *     tags:
 *       - Lesson Quotes
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lessonRequestId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the student's lesson request for which to generate quotes.
 *               teacherIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional. An array of specific teacher UUIDs to generate quotes for. If omitted or null, quotes will be generated for available teachers based on the lesson request type.
 *                 nullable: true
 *             required:
 *               - lessonRequestId
 *     responses:
 *       '201':
 *         description: Lesson quote(s) created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonQuote'
 *       '400':
 *         description: Bad request (e.g., validation error, invalid lessonRequestId or teacherIds format, request not found).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User is not a Student, or student does not own the lesson request).
 *       '404':
 *         description: Lesson request or specified teachers not found.
 */
router.post('/', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonQuoteController.createLessonQuote);

/**
 * @openapi
 * /lesson-quotes:
 *   get:
 *     summary: Get lesson quotes (filtered)
 *     description: Retrieves lesson quotes, filterable by `lessonRequestId` or `teacherId`.
 *     tags:
 *       - Lesson Quotes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonRequestId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter quotes by the lesson request ID.
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter quotes by the teacher ID.
 *     responses:
 *       '200':
 *         description: A list of lesson quotes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonQuote'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User does not have permission to view these quotes).
 */
router.get('/', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonQuoteController.getLessonQuotes);

/**
 * @openapi
 * /lesson-quotes/{quoteId}:
 *   patch:
 *     summary: Update lesson quote status
 *     description: Allows a student to accept/reject a quote, or a teacher to withdraw/modify it (status update).
 *     tags:
 *       - Lesson Quotes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quoteId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the lesson quote to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/LessonQuoteStatus' # Adjust schema ref if needed
 *             required:
 *               - status
 *     responses:
 *       '200':
 *         description: Lesson quote updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonQuote'
 *       '400':
 *         description: Bad request (e.g., invalid status transition).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (User cannot perform this action on this quote).
 *       '404':
 *         description: Lesson quote not found.
 */
router.patch('/:quoteId', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonQuoteController.updateLessonQuoteStatus);

export default router; 