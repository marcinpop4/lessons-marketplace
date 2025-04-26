import { Teacher } from '../../shared/models/Teacher.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { TeacherLessonHourlyRateMapper } from '../teacher-lesson-hourly-rate/teacher-lesson-hourly-rate.mapper.js';

// Import Prisma types with correct aliases
import type { Teacher as DbTeacher, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';

/**
 * Maps between Prisma Teacher objects and shared Teacher models.
 */
export class TeacherMapper {
    /**
     * Maps a Prisma Teacher object (and optionally its related hourly rates)
     * to a shared Teacher model instance.
     * @param dbTeacher The plain Teacher object from Prisma.
     * @param dbTeacherLessonHourlyRates Optional array of plain TeacherLessonHourlyRate objects from Prisma.
     * @returns A new instance of the shared Teacher model.
     */
    public static toModel(
        dbTeacher: DbTeacher, // Use correct alias
        dbTeacherLessonHourlyRates?: DbTeacherLessonHourlyRate[] // Use correct alias
    ): Teacher {
        // Remove destructuring
        // const { password, isActive, authMethods, createdAt, updatedAt, ...teacherProps } = dbTeacher;

        // Transform date
        const dateOfBirth = new Date(dbTeacher.dateOfBirth);

        // Transform hourly rates using the TeacherLessonHourlyRateMapper
        const transformedRates = dbTeacherLessonHourlyRates
            ? dbTeacherLessonHourlyRates.map(dbRate => TeacherLessonHourlyRateMapper.toModel(dbRate))
            : [];

        // Construct the shared model instance using the Teacher constructor, accessing props directly
        return new Teacher({
            id: dbTeacher.id,
            firstName: dbTeacher.firstName,
            lastName: dbTeacher.lastName,
            email: dbTeacher.email,
            phoneNumber: dbTeacher.phoneNumber,
            dateOfBirth: dateOfBirth, // Use the transformed date
            hourlyRates: transformedRates
            // Note: createdAt and updatedAt from dbTeacher are currently ignored
            // Add them here if they become part of the TeacherProps/Teacher model
            // createdAt: dbTeacher.createdAt ?? undefined, 
            // updatedAt: dbTeacher.updatedAt ?? undefined,
        });
    }
} 