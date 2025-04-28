import { Request, Response, NextFunction } from 'express';
import * as ObjectiveService from './objective.service.js';
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
            // Use the service function which likely still accepts studentId
            const objectives = await ObjectiveService.getObjectivesByStudentId(studentId);
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
            // Pass the studentId directly to the service (which now accepts it)
            const newObjective = await ObjectiveService.createObjective(
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
            // 1. Verify Ownership before attempting update
            const objectiveToUpdate = await ObjectiveService.findObjectiveById(objectiveId);

            if (!objectiveToUpdate) {
                // Use standard Error or NotFoundError - let's use NotFoundError from errors/index
                return next(new NotFoundError(`Objective with ID ${objectiveId} not found.`));
            }

            if (objectiveToUpdate.studentId !== studentId) {
                // Use AuthorizationError for a proper 403 response
                return next(new AuthorizationError(`Forbidden: You do not own objective ${objectiveId}.`));
            }

            // 2. If ownership verified, proceed with the status update
            const updatedObjective = await ObjectiveService.updateObjectiveStatus(objectiveId, status, context);

            res.json(updatedObjective); // Send back the updated objective with new status
        } catch (error) {
            next(error); // Pass errors (like invalid transitions from service) to error handler
        }
    }
}

// Export an instance of the class
export const objectiveController = new ObjectiveController(); 