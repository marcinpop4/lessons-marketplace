import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import type { TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';
import { LessonType } from '../../shared/models/LessonType.js';

/**
 * Maps between Prisma TeacherLessonHourlyRate objects and shared TeacherLessonHourlyRate models.
 */
export class TeacherLessonHourlyRateMapper {
    /**
     * Maps a Prisma TeacherLessonHourlyRate object to a shared TeacherLessonHourlyRate model instance.
     * @param dbTeacherLessonHourlyRate The plain TeacherLessonHourlyRate object from Prisma.
     * @returns A new instance of the shared TeacherLessonHourlyRate model.
     */
    public static toModel(dbTeacherLessonHourlyRate: DbTeacherLessonHourlyRate): TeacherLessonHourlyRate {
        // Remove destructuring
        // const { createdAt, updatedAt, type, ...rateProps } = dbTeacherLessonHourlyRate;

        // Instantiate using constructor from shared model, accessing props directly
        const instance = new TeacherLessonHourlyRate({
            id: dbTeacherLessonHourlyRate.id,
            teacherId: dbTeacherLessonHourlyRate.teacherId,
            type: dbTeacherLessonHourlyRate.type as LessonType, // Cast Prisma enum to shared enum
            rateInCents: dbTeacherLessonHourlyRate.rateInCents,
            // Explicitly handle potential null/undefined from DB if schema allows, otherwise map directly
            createdAt: dbTeacherLessonHourlyRate.createdAt ?? new Date(), // Assuming createdAt is non-null in DB based on previous code
            // Directly pass the DB value (Date or null) as null is allowed by the constructor/property type
            deactivatedAt: dbTeacherLessonHourlyRate.deactivatedAt,
            // Include updatedAt if it exists and is part of the shared model constructor
            updatedAt: dbTeacherLessonHourlyRate.updatedAt ?? undefined
        });

        return instance;
    }
} 