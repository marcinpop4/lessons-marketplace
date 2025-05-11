import { NextFunction, Request, Response } from 'express';
import { lessonSummaryService } from './lessonSummary.service.js';
import { CreateLessonSummaryDto } from './lessonSummary.dto.js';
import { toSharedLessonSummary } from './lessonSummary.mapper.js';

export class LessonSummaryController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // DTO from request body now includes lessonId
            const createLessonSummaryDto: CreateLessonSummaryDto = req.body;
            // const { lessonId, summary, homework } = createLessonSummaryDto; // No longer needed to destructure here for the service call

            // The service layer handles validation of lessonId and DTO contents
            // Pass the entire DTO to the service create method
            const prismaLessonSummary = await lessonSummaryService.create(createLessonSummaryDto);

            // Map to shared model for the response (as per architecture)
            const sharedLessonSummary = toSharedLessonSummary(prismaLessonSummary);

            res.status(201).json(sharedLessonSummary);
        } catch (error) {
            next(error); // Pass error to the global error handler
        }
    }

    // Add other methods like getById, update, delete as needed in the future.
}

export const lessonSummaryController = new LessonSummaryController(); 