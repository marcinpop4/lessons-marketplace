import { Request, Response, NextFunction } from 'express';
import { teacherLessonHourlyRateService } from './teacherLessonHourlyRate.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';

// Match error messages defined in the service
const ServiceErrors = {
    MISSING_DATA: 'Missing or invalid data for creating/updating hourly rate.',
    TEACHER_NOT_FOUND: 'Teacher not found.',
    RATE_NOT_FOUND_OR_ACCESS_DENIED: 'Lesson rate not found or access denied.',
    RATE_ALREADY_DEACTIVATED: 'Lesson rate is already deactivated.',
    RATE_ALREADY_ACTIVE: 'Lesson rate is already active.',
    RATE_CONFLICT_PREFIX: 'Another rate for type' // Prefix for the dynamic conflict message
};

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
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { lessonType, rateInCents } = req.body;

            // Basic validation (more specific validation is in the service)
            if (!lessonType || !Object.values(LessonType).includes(lessonType)) {
                res.status(400).json({
                    message: `Invalid or missing lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`
                });
                return;
            }
            if (rateInCents == null || isNaN(rateInCents) || rateInCents <= 0) {
                res.status(400).json({ message: 'Rate must be a positive number' });
                return;
            }

            const resultRate: TeacherLessonHourlyRate = await teacherLessonHourlyRateService.findOrCreateOrUpdate(teacherId, lessonType, rateInCents);
            res.status(200).json(resultRate);

        } catch (error) {
            console.error('[Controller Error] createOrUpdate:', error);
            if (error instanceof Error) {
                // Map service error messages to HTTP status codes
                if (error.message === ServiceErrors.TEACHER_NOT_FOUND || error.message === ServiceErrors.RATE_NOT_FOUND_OR_ACCESS_DENIED) {
                    res.status(404).json({ message: error.message });
                } else if (error.message === ServiceErrors.MISSING_DATA) {
                    res.status(400).json({ message: error.message });
                } else if (error.message.includes('Conflict:')) { // Catch conflict errors from service
                    res.status(409).json({ message: error.message });
                } else {
                    // Default to 500 for other errors from service or unexpected issues
                    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
                }
            } else {
                res.status(500).json({ message: 'An unknown internal server error occurred' });
            }
        }
    },

    /**
     * Deactivate a lesson hourly rate for the authenticated teacher.
     */
    deactivate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            const { rateId } = req.params;

            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            if (!rateId) {
                res.status(400).json({ message: 'Missing rate ID in URL' });
                return;
            }

            const deactivatedRate: TeacherLessonHourlyRate = await teacherLessonHourlyRateService.deactivate(teacherId, rateId);
            res.status(200).json(deactivatedRate);

        } catch (error) {
            console.error('[Controller Error] deactivate:', error);
            if (error instanceof Error) {
                if (error.message === ServiceErrors.RATE_NOT_FOUND_OR_ACCESS_DENIED) {
                    res.status(404).json({ message: error.message });
                } else if (error.message === ServiceErrors.RATE_ALREADY_DEACTIVATED) {
                    res.status(409).json({ message: error.message }); // Conflict
                } else {
                    res.status(500).json({ message: error.message || 'An error occurred while deactivating the lesson rate.' });
                }
            } else {
                res.status(500).json({ message: 'An unknown error occurred' });
            }
        }
    },

    /**
     * Reactivate a previously deactivated lesson hourly rate for the authenticated teacher.
     */
    reactivate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teacherId = req.user?.id;
            const { rateId } = req.params;

            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            if (!rateId) {
                res.status(400).json({ message: 'Missing rate ID in URL' });
                return;
            }

            const reactivatedRate: TeacherLessonHourlyRate = await teacherLessonHourlyRateService.reactivate(teacherId, rateId);
            res.status(200).json(reactivatedRate);

        } catch (error) {
            console.error('[Controller Error] reactivate:', error);
            if (error instanceof Error) {
                if (error.message === ServiceErrors.RATE_NOT_FOUND_OR_ACCESS_DENIED) {
                    res.status(404).json({ message: error.message });
                } else if (error.message === ServiceErrors.RATE_ALREADY_ACTIVE || error.message.startsWith(ServiceErrors.RATE_CONFLICT_PREFIX)) {
                    // Handle both already active and conflict with another active rate
                    res.status(409).json({ message: error.message }); // Conflict
                } else {
                    res.status(500).json({ message: error.message || 'An error occurred while reactivating the lesson rate.' });
                }
            } else {
                res.status(500).json({ message: 'An unknown error occurred' });
            }
        }
    },
}; 