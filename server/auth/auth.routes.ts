import express, { Router } from 'express';
import { authController } from './auth.controller.js'; // Import the controller

const router: Router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user with the provided details.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserDTO'
 *           example:
 *             firstName: "Jane"
 *             lastName: "Doe"
 *             email: "jane.doe@example.com"
 *             password: "SecureP@ss123"
 *             phoneNumber: "555-987-6543"
 *             dateOfBirth: "1992-05-20"
 *             userType: "STUDENT"
 *     responses:
 *       '201':
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '409':
 *         $ref: '#/components/responses/ConflictError'
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     description: Authenticates a user and returns a token and user details.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUserDTO'
 *           examples:
 *             studentLogin:
 *               summary: Example login for a student
 *               value:
 *                 email: "ethan.parker@example.com"
 *                 password: "12345678"
 *                 userType: "STUDENT"
 *             teacherLogin:
 *               summary: Example login for a teacher
 *               value:
 *                 email: "emily.richardson@musicschool.com"
 *                 password: "12345678"
 *                 userType: "TEACHER"
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Authentication token (JWT)
 *                 user:
 *                   description: The authenticated user's profile (either Student or Teacher).
 *                   oneOf: # Use oneOf to specify possible user types
 *                     - $ref: '#/components/schemas/Student'
 *                     - $ref: '#/components/schemas/Teacher'
 *                   discriminator: # Optional: Helps tools differentiate schemas
 *                      propertyName: userType # Assuming Student/Teacher schemas include userType
 *                      mapping:
 *                          STUDENT: '#/components/schemas/Student'
 *                          TEACHER: '#/components/schemas/Teacher'
 *               required: # Add required properties for the response object
 *                 - token
 *                 - user
 *         headers:
 *           Set-Cookie:
 *             description: Contains the auth token cookie (HttpOnly).
 *             schema:
 *               type: string
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out a user
 *     description: Clears the authentication cookie.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Clears the auth token cookie.
 *             schema:
 *               type: string
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Retrieves the details of the currently logged-in user.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Current user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', authController.getCurrentUser);

export default router; 