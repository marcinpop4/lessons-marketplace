import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuoteMapper } from '../lessonQuote/lessonQuote.mapper.js';
import { LessonStatusMapper } from '../lesson-status/lessonStatus.mapper.js';
import { toSharedLessonSummary } from '../lessonSummary/lessonSummary.mapper.js';
import { LessonSummary as SharedLessonSummary } from '../../shared/models/LessonSummary.js';
import { LessonSummary as PrismaLessonSummary } from '@prisma/client';
import { createChildLogger } from '../config/logger.js';

// Create child logger for lesson mapper
const logger = createChildLogger('lesson-mapper');

// Define database types locally
type DbLesson = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    quoteId: string;
    currentStatusId: string;
    quote?: any;
    currentStatus?: any;
};

// Define type for lesson with all required nested relations
type DbLessonWithNestedRelations = DbLesson & {
    currentStatus: {
        id: string;
        lessonId: string;
        status: string;
        context: any;
        createdAt: Date;
    };
    quote: {
        id: string;
        lessonRequestId: string;
        teacherId: string;
        hourlyRate: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: any;
        lessonRequest: any;
    };
    lessonSummary?: PrismaLessonSummary | null;
};

/**
 * Maps between database Lesson objects and shared Lesson models.
 */
export class LessonMapper {
    /**
     * Maps a database Lesson object with included relations to a shared Lesson model instance.
     * @param dbLesson The Lesson object from database with included relations.
     * @returns A new instance of the shared Lesson model or null if required relations are missing.
     */
    public static toModel(dbLesson: DbLessonWithNestedRelations): Lesson | null {
        const { id, createdAt, updatedAt, quoteId, currentStatusId, quote, currentStatus, lessonSummary: dbLessonSummary } = dbLesson;

        if (!quote || !currentStatus) {
            logger.error(`Lesson ${id} is missing required nested quote or currentStatus. Cannot transform.`);
            return null;
        }

        try {
            // Use the appropriate mappers to transform nested objects
            const transformedQuote = LessonQuoteMapper.toModel(quote);
            const transformedStatus = LessonStatusMapper.toModel(currentStatus);

            if (!transformedQuote || !transformedStatus) {
                logger.error(`Failed to transform nested quote or status for lesson ${id}`);
                return null;
            }

            let transformedLessonSummary: SharedLessonSummary | null = null;
            if (dbLessonSummary) {
                transformedLessonSummary = toSharedLessonSummary(dbLessonSummary);
                if (!transformedLessonSummary) {
                    logger.warn(`Failed to transform lesson summary for lesson ${id}. Proceeding without summary.`);
                }
            }

            // Construct the shared model instance
            return new Lesson({
                id,
                quote: transformedQuote,
                currentStatus: transformedStatus,
                statuses: [transformedStatus], // Include at least the current status in statuses
                lessonSummary: transformedLessonSummary,
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined,
            });
        } catch (error: unknown) {
            logger.error(`Error transforming lesson ${id}:`, { error });
            return null;
        }
    }
} 