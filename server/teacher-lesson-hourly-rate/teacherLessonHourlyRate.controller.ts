import { Request, Response, NextFunction } from 'express';
import { teacherLessonHourlyRateService } from './teacherLessonHourlyRate.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
// Import status transition enum
import { TeacherLessonHourlyRateStatusTransition } from '../../shared/models/TeacherLessonHourlyRateStatus.js';
import { BadRequestError, NotFoundError, ConflictError } from '../errors/index.js';

// Match error messages defined in the service
const ServiceErrors = {
    MISSING_DATA: 'Missing or invalid data for creating/updating hourly rate.',
    TEACHER_NOT_FOUND: 'Teacher not found.',
    RATE_NOT_FOUND_OR_ACCESS_DENIED: 'Lesson rate not found or access denied.',
    RATE_ALREADY_DEACTIVATED: 'Lesson rate is already deactivated.',
    RATE_ALREADY_ACTIVE: 'Lesson rate is already active.',
    RATE_CONFLICT_PREFIX: 'Another rate for type' // Prefix for the dynamic conflict message
};

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Controller for Teacher Lesson Hourly Rate operations
 */
export const teacherLessonHourlyRateController = {

    /**
     * Create or update a lesson hourly rate for the authenticated teacher.
     */
    createOrUpdate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            if (!teacherId) {
                // Using throw new AuthError() pattern might be better with central handler
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { lessonType, rateInCents } = req.body;

            // Use service layer for all validation as per architecture rules
            const result = await teacherLessonHourlyRateService.createOrUpdateLessonRate(teacherId, lessonType, rateInCents);

            // Set status code based on whether the rate was created or updated
            const statusCode = result.wasCreated ? 201 : 200;
            res.status(statusCode).json(result.rate);

        } catch (error) {
            // Pass errors to the central error handler
            next(error);
        }
    },

    /**
     * Update the status of a lesson hourly rate (Activate/Deactivate).
     */
    updateStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            const { rateId } = req.params;
            const { transition, context } = req.body; // Expect transition (ACTIVATE/DEACTIVATE)

            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' }); // Or throw AuthError
                return;
            }

            // Validate rateId format
            if (!rateId || !UUID_REGEX.test(rateId)) {
                throw new BadRequestError('Invalid or missing rate ID format in URL. Must be a valid UUID.');
            }

            // Validate transition value
            if (!transition || !Object.values(TeacherLessonHourlyRateStatusTransition).includes(transition)) {
                throw new BadRequestError(`Invalid or missing transition. Must be one of: ${Object.values(TeacherLessonHourlyRateStatusTransition).join(', ')}`);
            }

            // Call the new service method
            const updatedRate = await teacherLessonHourlyRateService.updateLessonRateStatus(
                teacherId,
                rateId,
                transition as TeacherLessonHourlyRateStatusTransition,
                context // Pass context along if provided
            );

            res.status(200).json(updatedRate);

        } catch (error) {
            // Pass errors (BadRequestError, NotFoundError, ConflictError etc.) to central handler
            next(error);
        }
    },

    // Remove old deactivate and reactivate methods
    /*
    deactivate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // ... old implementation ...
    },
    reactivate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // ... old implementation ...
    },
    */
}; 