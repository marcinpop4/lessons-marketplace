import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { TeacherMapper } from '../teacher/teacher.mapper.js';
import { LessonRequestMapper } from '../lessonRequest/lessonRequest.mapper.js';
import { LessonQuoteStatusMapper } from '../lessonQuoteStatus/lessonQuoteStatus.mapper.js';
import { Prisma } from '@prisma/client';

// Define Prisma types for includes required by the mapper
type DbTeacherWithRates = Prisma.TeacherGetPayload<{ include: { teacherLessonHourlyRates: true } }>;
type DbLessonRequestWithRelations = Prisma.LessonRequestGetPayload<{ include: { student: true, address: true } }>;
type DbLessonQuoteWithRelations = Prisma.LessonQuoteGetPayload<{
    include: {
        teacher: { include: { teacherLessonHourlyRates: true } },
        lessonRequest: { include: { student: true, address: true } },
        currentStatus: true
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
    public static toModel(dbQuote: DbLessonQuoteWithRelations): LessonQuote {
        try {
            const {
                id,
                costInCents,
                hourlyRateInCents,
                createdAt,
                updatedAt,
                teacher,
                lessonRequest,
                currentStatus
            } = dbQuote;

            // Use the appropriate mappers to transform nested objects
            const teacherModel = TeacherMapper.toModel(
                teacher,
                teacher.teacherLessonHourlyRates
            );

            const lessonRequestModel = LessonRequestMapper.toModel(lessonRequest);

            // Map the currentStatus using the correct mapper (LessonQuoteStatusMapper)
            const currentStatusModel = currentStatus
                ? LessonQuoteStatusMapper.toModel(currentStatus as Prisma.LessonStatus)
                : null;

            // Construct the shared model instance, adding currentStatus AND currentStatusId
            return new LessonQuote({
                id,
                lessonRequest: lessonRequestModel,
                teacher: teacherModel,
                costInCents,
                hourlyRateInCents: hourlyRateInCents ?? 0,
                currentStatus: currentStatusModel,
                currentStatusId: currentStatusModel?.id ?? null,
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined
            });
        } catch (error: unknown) {
            console.error('Error in LessonQuoteMapper.toModel:', error);
            throw new Error(`Failed to transform LessonQuote: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 