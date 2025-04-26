import { Lesson, DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
import { LessonQuoteMapper } from '../lessonQuote/lessonQuote.mapper.js';
import { LessonStatusMapper } from '../lesson-status/lessonStatus.mapper.js';
import { Prisma } from '@prisma/client';

// Define Prisma types for includes required by the mapper
type DbLessonWithRelations = Prisma.LessonGetPayload<{
    include: {
        currentStatus: true,
        quote: {
            include: {
                teacher: { include: { teacherLessonHourlyRates: true } },
                lessonRequest: { include: { student: true, address: true } }
            }
        }
    }
}>;

/**
 * Maps between Prisma Lesson objects and shared Lesson models.
 */
export class LessonMapper {
    /**
     * Maps a Prisma Lesson object with included relations to a shared Lesson model instance.
     * @param dbLesson The Lesson object from Prisma with included relations.
     * @returns A new instance of the shared Lesson model or null if required relations are missing.
     */
    public static toModel(dbLesson: any): Lesson | null {
        const { id, createdAt, updatedAt, quoteId, currentStatusId, quote, currentStatus } = dbLesson;

        if (!quote || !currentStatus) {
            console.error(`Lesson ${id} is missing required nested quote or currentStatus. Cannot transform.`);
            return null;
        }

        try {
            // Use the appropriate mappers to transform nested objects
            const transformedQuote = LessonQuoteMapper.toModel(quote);
            const transformedStatus = LessonStatusMapper.toModel(currentStatus);

            // Construct the shared model instance
            return new Lesson({
                id,
                quote: transformedQuote,
                currentStatusId: transformedStatus.id,
                currentStatus: transformedStatus,
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined,
            });
        } catch (error: unknown) {
            console.error(`Error transforming lesson ${id}:`, error);
            return null;
        }
    }
} 