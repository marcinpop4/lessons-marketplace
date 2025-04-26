import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { TeacherMapper } from '../teacher/teacher.mapper.js';
import { LessonRequestMapper } from '../lessonRequest/lessonRequest.mapper.js';
import { Prisma } from '@prisma/client';

// Define Prisma types for includes required by the mapper
type DbTeacherWithRates = Prisma.TeacherGetPayload<{ include: { teacherLessonHourlyRates: true } }>;
type DbLessonRequestWithRelations = Prisma.LessonRequestGetPayload<{ include: { student: true, address: true } }>;
type DbLessonQuoteWithRelations = Prisma.LessonQuoteGetPayload<{
    include: {
        teacher: { include: { teacherLessonHourlyRates: true } },
        lessonRequest: { include: { student: true, address: true } }
    }
}>;

/**
 * Maps between Prisma LessonQuote objects and shared LessonQuote models.
 */
export class LessonQuoteMapper {
    /**
     * Maps a Prisma LessonQuote object with included relations to a shared LessonQuote model instance.
     * @param dbQuote The LessonQuote object from Prisma with included relations.
     * @returns A new instance of the shared LessonQuote model.
     */
    public static toModel(dbQuote: any): LessonQuote {
        try {
            const { id, costInCents, hourlyRateInCents, createdAt, updatedAt } = dbQuote;

            // Use the appropriate mappers to transform nested objects
            const teacherModel = TeacherMapper.toModel(
                dbQuote.teacher,
                dbQuote.teacher.teacherLessonHourlyRates
            );

            const lessonRequestModel = LessonRequestMapper.toModel(dbQuote.lessonRequest);

            // Construct the shared model instance
            return new LessonQuote({
                id,
                lessonRequest: lessonRequestModel,
                teacher: teacherModel,
                costInCents,
                hourlyRateInCents: hourlyRateInCents ?? 0,
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined
            });
        } catch (error: unknown) {
            console.error('Error in LessonQuoteMapper.toModel:', error);
            throw new Error(`Failed to transform LessonQuote: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 