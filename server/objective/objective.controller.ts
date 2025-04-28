import { Request, Response, NextFunction } from 'express';
import { objectiveService } from './objective.service.js';
import { isUuid } from '../utils/validation.utils.js';
import { LessonType } from '../../shared/models/LessonType.js'; // Import LessonType enum
import { ObjectiveStatusValue } from '../../shared/models/ObjectiveStatus.js'; // Import Status enum
import { BadRequestError, AuthorizationError, NotFoundError } from '../errors/index.js';
import { UserType as PrismaUserType } from '@prisma/client'; // Keep if needed elsewhere
import { Objective } from '@shared/models/Objective.js';

// Type helper for parsed query parameters
interface GetObjectivesQuery {
    studentId?: string;
    lessonType?: string;
    status?: string; // Comma-separated statuses
}

// Type helper for stream query parameters
interface StreamObjectivesQuery {
    lessonType?: string;
    // Removed count as it's handled by service default
}

// Assuming validation functions are not available, perform inline checks
const isValidLessonType = (type: any): type is LessonType => Object.values(LessonType).includes(type as LessonType);
const isValidObjectiveStatusValue = (status: any): status is ObjectiveStatusValue => Object.values(ObjectiveStatusValue).includes(status as ObjectiveStatusValue);

class ObjectiveController {
    /**
     * GET /api/v1/objectives
     * Get objectives for a specific student ID provided in the query.
     * Assumes authentication middleware has run.
     */
    async getObjectives(req: Request, res: Response, next: NextFunction) {
        // studentId is now REQUIRED from the query
        const { studentId, lessonType: lessonTypeQuery, status: statusQuery } = req.query as GetObjectivesQuery;

        // --- Validation --- 
        if (!studentId || !isUuid(studentId)) {
            return next(new BadRequestError('Missing or invalid studentId query parameter.'));
        }
        // Authentication is still assumed to be handled by middleware, but we don't use the authenticated user ID here.

        // --- Filter Processing (remains the same) ---
        let lessonTypeFilter: LessonType | undefined = undefined;
        if (lessonTypeQuery) {
            if (isValidLessonType(lessonTypeQuery)) {
                lessonTypeFilter = lessonTypeQuery;
            } else {
                return next(new BadRequestError(`Invalid lessonType query parameter: ${lessonTypeQuery}.`));
            }
        }
        let statusFilter: ObjectiveStatusValue[] | undefined = undefined;
        if (statusQuery) {
            const statuses = statusQuery.split(',').map(s => s.trim()).filter(s => s);
            if (statuses.every(isValidObjectiveStatusValue)) {
                statusFilter = statuses as ObjectiveStatusValue[];
            } else {
                return next(new BadRequestError(`Invalid status value provided in query parameter.`));
            }
        }

        // --- Service Call --- 
        try {
            // Use the validated studentId from the query
            const objectives = await objectiveService.getObjectivesByStudentId(studentId, lessonTypeFilter, statusFilter);
            res.json(objectives);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/objectives
     * Create a new objective for the authenticated student.
     */
    async createObjective(req: Request, res: Response, next: NextFunction) {
        // Assuming authMiddleware adds user to req as req.user
        const studentId = (req as any).user?.id;
        if (!studentId) {
            return next(new AuthorizationError('Authentication required.'));
        }

        const { title, description, lessonType, targetDate: targetDateString } = req.body;

        // Basic validation
        if (!title || !description || !lessonType || !targetDateString) {
            return next(new BadRequestError('Missing required fields: title, description, lessonType, targetDate.'));
        }
        if (!isValidLessonType(lessonType)) {
            return next(new BadRequestError(`Invalid lesson type: ${lessonType}`));
        }
        const targetDate = new Date(targetDateString);
        if (isNaN(targetDate.getTime())) {
            return next(new BadRequestError('Invalid date format for targetDate.'));
        }

        try {
            const newObjective = await objectiveService.createObjective(
                studentId,
                title,
                description,
                lessonType,
                targetDate
            );
            res.status(201).json(newObjective);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/v1/objectives/:objectiveId
     * Update the status of an objective.
     */
    async updateObjectiveStatus(req: Request, res: Response, next: NextFunction) {
        const { objectiveId } = req.params;
        const { status, context } = req.body;
        const userId = (req as any).user?.id; // Used for ownership check if needed by service

        if (!userId) {
            return next(new AuthorizationError('Authentication required.'));
        }
        if (!objectiveId || !isUuid(objectiveId)) {
            return next(new BadRequestError('Invalid or missing objectiveId parameter.'));
        }
        if (!status || !isValidObjectiveStatusValue(status)) {
            return next(new BadRequestError('Missing or invalid status in request body.'));
        }

        try {
            // Consider adding ownership check here or ensure service does it
            // For now, assuming service handles validation/ownership based on logged-in user if needed
            const updatedObjective = await objectiveService.updateObjectiveStatus(objectiveId, status, context);
            res.json(updatedObjective);
        } catch (error) {
            next(error); // Pass errors (like NotFoundError, BadRequestError) to error handler
        }
    }

    /**
     * GET /api/v1/objectives/recommendations/stream
     * Stream AI-powered objective recommendations.
     */
    async streamRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const studentId = (req as any).user?.id;
            if (!studentId) {
                console.error("[SSE Controller] Authenticated user ID not found.");
                // Use end() for SSE streams on error before headers sent
                if (!res.headersSent) res.status(401).end();
                return;
            }

            // Extract optional lessonType from query parameters
            const { lessonType: lessonTypeQuery } = req.query as StreamObjectivesQuery;

            // Validate lessonType - IT IS REQUIRED by the service method
            let lessonType: LessonType | undefined = undefined;
            if (lessonTypeQuery && isValidLessonType(lessonTypeQuery)) {
                lessonType = lessonTypeQuery;
            } else {
                // If missing or invalid, return error as service requires it
                return next(new BadRequestError(`Valid lessonType query parameter is required for recommendations.`));
            }

            // Call the service method, lessonType is guaranteed valid here
            await objectiveService.streamObjectiveRecommendations(studentId, lessonType, res);

        } catch (error) {
            // Catch errors that occur *before* streaming starts
            console.error("Error setting up stream in objectiveController:", error);
            if (!res.headersSent) {
                next(error);
            }
        }
    }
}

// Export a singleton instance of the class
export const objectiveController = new ObjectiveController(); 