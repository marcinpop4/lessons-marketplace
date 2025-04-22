import { Request, Response } from 'express';
import prisma from '../prisma.js'; // Import shared prisma instance
import { studentService } from './student.service.js';

/**
 * Controller for student-related operations.
 */
export const studentController = {
    /**
     * Create a new student.
     * Handles request validation and calls the student service.
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

            // Convert dateOfBirth string to Date object
            const dob = new Date(dateOfBirth);

            // Check if dateOfBirth resulted in an Invalid Date
            if (isNaN(dob.getTime())) {
                res.status(400).json({ message: 'Invalid date format for dateOfBirth. Please use YYYY-MM-DD or a valid date string.' });
                return;
            }

            const studentData = {
                email,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth: dob, // Use the validated Date object
                password // Pass plain text password to service
            };

            const newStudent = await studentService.create(prisma, studentData);

            // Service returns null if creation fails, handle this (though it throws now)
            if (!newStudent) {
                res.status(500).json({ message: 'Student creation failed unexpectedly.' });
                return;
            }

            res.status(201).json(newStudent);

        } catch (error) {
            console.error('Error in studentController.createStudent:', error);
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
     */
    async getStudentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({ message: 'Student ID is required.' });
                return;
            }

            const student = await studentService.findById(prisma, id);

            if (!student) {
                res.status(404).json({ message: 'Student not found.' });
                return;
            }

            res.status(200).json(student);
        } catch (error) {
            console.error('Error in studentController.getStudentById:', error);
            if (error instanceof Error) {
                res.status(400).json({ message: `Bad Request: ${error.message}` });
            } else {
                res.status(500).json({ message: 'Internal server error while fetching student.' });
            }
        }
    }
}; 