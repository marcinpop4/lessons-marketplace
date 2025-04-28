import { Request, Response, NextFunction } from 'express';
import { objectiveService } from './objective.service.js';
import { ObjectiveStatusValue } from '@shared/models/ObjectiveStatus.js';
import { LessonType } from '@shared/models/LessonType.js';
import { BadRequestError, NotFoundError, AuthorizationError } from '../errors/index.js';
import { UserType as PrismaUserType } from '@prisma/client';

// Assuming authMiddleware adds user object to req like req.user = { id: string, type: UserType, ... }
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userType: PrismaUserType;
        // Add other user properties if needed (e.g., type)
    };
}

// Validation function for ObjectiveStatusValue
const isValidObjectiveStatusValue = (status: any): status is ObjectiveStatusValue => {
    return Object.values(ObjectiveStatusValue).includes(status as ObjectiveStatusValue);
};

// Validation function for LessonType
const isValidLessonType = (type: any): type is LessonType => {
    return Object.values(LessonType).includes(type as LessonType);
};

// Wrap functions in a class
class ObjectiveController {
    /**
     * GET /api/v1/objectives
     * Get objectives for the authenticated student.
     */
    async getObjectives(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        // Get student ID from the authenticated user attached by middleware
        const studentId = req.user?.id;

        if (!studentId) {
            // This should technically be caught by authMiddleware, but double-check
            return next(new Error('Authentication required: User ID not found on request.'));
        }

        try {
            // Use the imported singleton instance
            const objectives = await objectiveService.getObjectivesByStudentId(studentId);
            res.json(objectives);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/objectives
     * Create a new objective for the authenticated student.
     */
    async createObjective(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        // Get student ID from the authenticated user
        const studentId = req.user?.id;
        const { title, description, lessonType, targetDate } = req.body;

        if (!studentId) {
            // Use next for consistent error handling
            return next(new AuthorizationError('Authentication required: User ID not found for objective creation.'));
        }

        // Basic validation
        if (!title || !description || !lessonType || !targetDate) {
            return next(new BadRequestError('Missing required fields: title, description, lessonType, targetDate.'));
        }

        // Validate lessonType enum
        if (!isValidLessonType(lessonType)) {
            return next(new BadRequestError(`Invalid lessonType: ${lessonType}. Valid types are: ${Object.values(LessonType).join(', ')}`));
        }

        // Validate and parse targetDate
        const parsedDate = new Date(targetDate);
        if (isNaN(parsedDate.getTime())) {
            return next(new BadRequestError('Invalid targetDate format.'));
        }

        // Add validation: Check if targetDate is in the future
        if (parsedDate <= new Date()) {
            return next(new BadRequestError('Target date must be in the future.'));
        }

        try {
            // Use the imported singleton instance
            const newObjective = await objectiveService.createObjective(
                studentId,
                title,
                description,
                lessonType,
                parsedDate
            );
            res.status(201).json(newObjective); // 201 Created status
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/v1/objectives/:objectiveId
     * Update the status of an objective (e.g., ACHIEVED, ABANDONED).
     * Renamed from updateObjectiveStatusHandler for consistency.
     */
    async updateObjectiveStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        const { objectiveId } = req.params;
        const { status, context } = req.body;
        const studentId = req.user?.id; // Get authenticated user ID

        // Basic validation
        if (!studentId) {
            return next(new Error('Authentication required: User ID not found for objective update.'));
        }
        if (!objectiveId || !status) {
            return next(new BadRequestError('Objective ID and status are required.'));
        }
        if (!isValidObjectiveStatusValue(status)) {
            return next(new BadRequestError(`Invalid status value: ${status}. Must be one of ${Object.values(ObjectiveStatusValue).join(', ')}`));
        }

        try {
            // 1. Verify Ownership using the singleton instance
            const objectiveToUpdate = await objectiveService.findObjectiveById(objectiveId);

            if (!objectiveToUpdate) {
                // Use standard Error or NotFoundError - let's use NotFoundError from errors/index
                return next(new NotFoundError(`Objective with ID ${objectiveId} not found.`));
            }

            if (objectiveToUpdate.studentId !== studentId) {
                // Use AuthorizationError for a proper 403 response
                return next(new AuthorizationError(`Forbidden: You do not own objective ${objectiveId}.`));
            }

            // 2. If ownership verified, proceed with the status update using the singleton instance
            const updatedObjective = await objectiveService.updateObjectiveStatus(objectiveId, status, context);

            res.json(updatedObjective); // Send back the updated objective with new status
        } catch (error) {
            next(error); // Pass errors (like invalid transitions from service) to error handler
        }
    }

    /**
     * GET /api/v1/objectives/recommendations/stream
     * Stream AI-powered objective recommendations.
     */
    async streamRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                console.error("[SSE Controller] Authenticated user ID not found.");
                res.status(401).end();
                return;
            }
            const studentId = authenticatedUser.id;

            // Extract optional lessonType from query parameters
            const { lessonType: lessonTypeQuery } = req.query;

            // Validate lessonType if provided
            let lessonType: LessonType | null = null;
            if (lessonTypeQuery && typeof lessonTypeQuery === 'string') {
                if (isValidLessonType(lessonTypeQuery)) {
                    lessonType = lessonTypeQuery;
                } else {
                    return next(new BadRequestError(`Invalid lessonType query parameter: ${lessonTypeQuery}.`));
                }
            }

            // Call the service method using the singleton instance, without count
            await objectiveService.streamObjectiveRecommendations(studentId, lessonType, res);

            // IMPORTANT: Do not call res.end() here. The streamJsonResponse utility handles it.

        } catch (error) {
            // Catch errors that occur *before* streaming starts
            console.error("Error setting up stream in objectiveController:", error);
            if (!res.headersSent) {
                next(error);
            }
            // If headers sent, streamJsonResponse handles internal errors.
        }
    }
}

// Export an instance of the class
export const objectiveController = new ObjectiveController(); 