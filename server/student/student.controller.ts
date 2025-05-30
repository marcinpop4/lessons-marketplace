import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service.js';
import authService, { AuthMethod } from '../auth/auth.service.js';
import { UserType } from '../../shared/models/UserType.js';
import { AuthorizationError } from '../errors/index.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for student controller
const logger = createChildLogger('student-controller');

/**
 * Controller for student-related operations.
 */
export const studentController = {
    /**
     * Create a new student.
     * Handles request validation and calls the auth service to register a student.
     * @param req Request object, body should contain student data + password.
     * @param res Response object.
     */
    async createStudent(req: Request, res: Response): Promise<void> {
        try {
            const { password, email, firstName, lastName, phoneNumber, dateOfBirth } = req.body;

            // Basic validation
            if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth) {
                res.status(400).json({ message: 'Missing required fields for student creation.' });
                return;
            }

            // Phone number format validation (simple example: allows digits, hyphens, spaces, parentheses, +)
            const phoneRegex = /^[\d\s\(\)\-\+]+$/;
            if (typeof phoneNumber !== 'string' || !phoneRegex.test(phoneNumber)) {
                res.status(400).json({ message: 'Invalid phone number format.' });
                return;
            }

            // Convert dateOfBirth string to Date object
            const dob = new Date(dateOfBirth);

            // Check if dateOfBirth resulted in an Invalid Date
            if (isNaN(dob.getTime())) {
                res.status(400).json({ message: 'Invalid date format for dateOfBirth. Please use YYYY-MM-DD or a valid date string.' });
                return;
            }

            // Prepare registration data for auth service
            const registrationData = {
                email,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth: dob, // Use the validated Date object
                userType: UserType.STUDENT,
                auth: {
                    method: 'PASSWORD' as AuthMethod,
                    password
                }
            };

            // Use auth service to register the student
            const { user } = await authService.register(registrationData);

            res.status(201).json(user);

        } catch (error) {
            logger.error('Error in studentController.createStudent:', error);
            // Check for the specific unique constraint error message from the service
            if (error instanceof Error && error.message.includes('already exists')) {
                res.status(409).json({ message: error.message }); // Conflict
            } else if (error instanceof Error) {
                res.status(400).json({ message: `Bad Request: ${error.message}` }); // Other validation errors
            } else {
                res.status(500).json({ message: 'Internal server error during student creation.' });
            }
        }
    },

    /**
     * Get student details by ID.
     * @param req Request object containing student ID in params.
     * @param res Response object.
     * @param next Next function for error handling.
     */
    async getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: requestedStudentId } = req.params;
            // Cast req.user to expected structure, using string for userType
            const authenticatedUser = req.user as { id: string; userType: string } | undefined;

            // Basic validation (already required by authMiddleware)
            if (!authenticatedUser) {
                // Should not happen if authMiddleware runs first, but defensive
                return next(new Error('Internal error: User data missing after authentication.'));
            }

            if (!requestedStudentId) {
                res.status(400).json({ message: 'Student ID is required.' });
                return;
            }

            // Fetch student data
            const student = await studentService.findById(requestedStudentId);

            if (!student) {
                res.status(404).json({ message: 'Student not found.' });
                return;
            }

            // --- Authorization Check: Resource Ownership --- 
            // Compare string values (authenticatedUser.userType is already treated as string)
            if (authenticatedUser.userType === UserType.STUDENT && authenticatedUser.id !== requestedStudentId) {
                // Throwing an error will be caught and handled by the error middleware (usually returning 403)
                return next(new AuthorizationError('Forbidden: Students can only retrieve their own profile.'));
            }
            // Teachers are allowed based on the checkRole middleware in the routes file.
            // --- End Authorization Check --- 

            res.status(200).json(student);
        } catch (error) {
            logger.error('Error in studentController.getStudentById:', error);
            // Pass error to the central error handler
            next(error);
        }
    }
}; 