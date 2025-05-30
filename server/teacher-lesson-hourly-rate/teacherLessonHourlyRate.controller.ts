import { Request, Response, NextFunction } from 'express';
import { teacherLessonHourlyRateService } from './teacherLessonHourlyRate.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
// Import status transition enum and status class
import { TeacherLessonHourlyRateStatus, TeacherLessonHourlyRateStatusTransition, TeacherLessonHourlyRateStatusValue } from '../../shared/models/TeacherLessonHourlyRateStatus.js';
import { BadRequestError, NotFoundError, ConflictError, AppError } from '../errors/index.js';

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
     * Create a new lesson hourly rate for the authenticated teacher.
     * Throws ConflictError if a rate for the type already exists.
     */
    create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            if (!teacherId) {
                // Consider throwing AuthError for consistency
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { lessonType, rateInCents } = req.body;

            // Call the new service method which handles validation and creation
            const createdRate = await teacherLessonHourlyRateService.createLessonRate(teacherId, lessonType, rateInCents);

            // Always return 201 Created on success
            res.status(201).json(createdRate);

        } catch (error) {
            // Pass errors (BadRequestError, NotFoundError, ConflictError etc.) to central handler
            next(error);
        }
    },

    /**
     * Update the status of a lesson hourly rate (e.g., ACTIVE/INACTIVE).
     * Expects the target status (ACTIVE/INACTIVE) in the request body.
     */
    updateStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            const { id: rateId } = req.params; // Get rate ID from URL parameter
            // Expect the target status directly in the body now
            const { status: targetStatus, context } = req.body;

            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Validate rateId format
            if (!rateId || !UUID_REGEX.test(rateId)) {
                throw new BadRequestError('Invalid or missing rate ID format in URL. Must be a valid UUID.');
            }

            // Validate the received target status
            if (!targetStatus || !Object.values(TeacherLessonHourlyRateStatusValue).includes(targetStatus)) {
                throw new BadRequestError(`Invalid or missing status. Must be one of: ${Object.values(TeacherLessonHourlyRateStatusValue).join(', ')}`);
            }

            // First, get the current rate to determine current status
            const currentRate = await teacherLessonHourlyRateService.findRateById(teacherId, rateId);
            if (!currentRate) {
                throw new NotFoundError('Lesson rate not found or access denied.');
            }

            const currentStatus = currentRate.currentStatus?.status;
            if (!currentStatus) {
                throw new ConflictError('Cannot update status: Rate has no current status record.');
            }

            // Determine what transition is needed to get to the target status
            const requiredTransition = TeacherLessonHourlyRateStatus.getRequiredTransition(
                currentStatus as TeacherLessonHourlyRateStatusValue,
                targetStatus as TeacherLessonHourlyRateStatusValue
            );

            if (requiredTransition === null) {
                if (currentStatus === targetStatus) {
                    throw new ConflictError(`Rate is already ${targetStatus}.`);
                } else {
                    throw new BadRequestError(`Cannot transition from ${currentStatus} to ${targetStatus}.`);
                }
            }

            // Call the service method with the determined transition
            const updatedRate = await teacherLessonHourlyRateService.updateLessonRateStatus(
                teacherId,
                rateId,
                requiredTransition,
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