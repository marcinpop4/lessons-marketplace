import { PrismaClient, LessonSummary as PrismaLessonSummary } from '@prisma/client';
import { CreateLessonSummaryDto } from './lessonSummary.dto.js';
import { BadRequestError, NotFoundError } from '../errors/index.js'; // Corrected import path
import { LessonSummary } from '../../shared/models/LessonSummary.js';
import { toSharedLessonSummary } from './lessonSummary.mapper.js';
import { isUuid } from '../utils/validation.utils.js';
import prisma from '../prisma.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for lesson summary service
const logger = createChildLogger('lesson-summary-service');

export class LessonSummaryService {
    /**
     * Creates a new lesson summary.
     * Validates that the lesson exists, is completed, and does not already have a summary.
     * @param createLessonSummaryDto The DTO containing lessonId, summary and homework.
     * @returns The created lesson summary.
     * @throws NotFoundError if the lesson is not found.
     * @throws BadRequestError if the lesson is not completed, or already has a summary, or if input is invalid.
     */
    async create(createLessonSummaryDto: CreateLessonSummaryDto) {
        const { lessonId, summary, homework } = createLessonSummaryDto;

        // --- Basic Input Validation (as per architecture rules) ---
        if (!lessonId || typeof lessonId !== 'string') {
            throw new BadRequestError('Lesson ID is required and must be a string.');
        }

        // Validate UUID format for lessonId
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(lessonId)) {
            throw new BadRequestError('Lesson ID must be a valid UUID.');
        }

        if (!summary || typeof summary !== 'string' || summary.trim().length < 10 || summary.trim().length > 5000) {
            throw new BadRequestError('Summary is required, must be a string between 10 and 5000 characters.');
        }
        if (!homework || typeof homework !== 'string' || homework.trim().length < 5 || homework.trim().length > 2000) {
            throw new BadRequestError('Homework is required, must be a string between 5 and 2000 characters.');
        }
        // --- End Basic Input Validation ---

        // Fetch the lesson and its current status, and check for an existing summary
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                currentStatus: true, // To check if the lesson is COMPLETED
                lessonSummary: true, // To check if a summary already exists
            },
        });

        if (!lesson) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        // Validate lesson status - should be COMPLETED
        // IMPORTANT: This relies on 'COMPLETED' being the string value used in your LessonStatusValue enum/model
        if (lesson.currentStatus?.status !== 'COMPLETED') {
            throw new BadRequestError('Lesson summary can only be created for completed lessons.');
        }

        // Check if a summary already exists for this lesson
        if (lesson.lessonSummary) {
            throw new BadRequestError(`Lesson with ID ${lessonId} already has a summary.`);
        }

        // Create the lesson summary
        try {
            const newLessonSummary = await prisma.lessonSummary.create({
                data: {
                    lessonId: lessonId,
                    summary: summary.trim(),
                    homework: homework.trim(),
                },
            });
            return newLessonSummary;
        } catch (error) {
            logger.error("Error creating lesson summary in Prisma:", error);
            throw error;
        }
    }
}

export const lessonSummaryService = new LessonSummaryService(); 