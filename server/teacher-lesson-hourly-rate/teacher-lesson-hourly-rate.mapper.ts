import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
// Import the Prisma types, including the new status type
import * as PrismaClient from '@prisma/client'; // Import all types
import { LessonType } from '../../shared/models/LessonType.js';
// Import the shared status model and enum
import { TeacherLessonHourlyRateStatus, TeacherLessonHourlyRateStatusValue } from '../../shared/models/TeacherLessonHourlyRateStatus.js';
// Import the shared JsonValue type
import { JsonValue } from '../../shared/types/JsonTypes.js'; // Add this import

/**
 * Maps between Prisma TeacherLessonHourlyRate objects and shared TeacherLessonHourlyRate models.
 */
export class TeacherLessonHourlyRateMapper {
    /**
     * Maps a Prisma TeacherLessonHourlyRateStatus object to a shared TeacherLessonHourlyRateStatus model instance.
     * @param dbStatus The Prisma status object.
     * @returns A new instance of the shared TeacherLessonHourlyRateStatus model.
     */
    private static toStatusModel(dbStatus: PrismaClient.TeacherLessonHourlyRateStatus): TeacherLessonHourlyRateStatus { // Use namespace
        return new TeacherLessonHourlyRateStatus({
            id: dbStatus.id,
            rateId: dbStatus.rateId,
            status: dbStatus.status as TeacherLessonHourlyRateStatusValue, // Cast enum
            context: (dbStatus.context as JsonValue) ?? undefined, // Explicitly cast and handle nullish
            createdAt: dbStatus.createdAt,
        });
    }

    /**
     * Maps a Prisma TeacherLessonHourlyRate object (potentially including its current status relation)
     * to a shared TeacherLessonHourlyRate model instance.
     * @param dbRate The plain TeacherLessonHourlyRate object from Prisma.
     * @param dbCurrentStatus Optional: The related Prisma TeacherLessonHourlyRateStatus object (if included in the query).
     * @returns A new instance of the shared TeacherLessonHourlyRate model.
     */
    public static toModel(
        dbRate: PrismaClient.TeacherLessonHourlyRate, // Use namespace
        dbCurrentStatus?: PrismaClient.TeacherLessonHourlyRateStatus | null // Use namespace
    ): TeacherLessonHourlyRate {

        // Map the related status object if provided
        const currentStatusModel = dbCurrentStatus ? TeacherLessonHourlyRateMapper.toStatusModel(dbCurrentStatus) : null;

        // Instantiate using constructor from shared model
        const instance = new TeacherLessonHourlyRate({
            id: dbRate.id,
            teacherId: dbRate.teacherId,
            type: dbRate.type as LessonType, // Cast Prisma enum to shared enum
            rateInCents: dbRate.rateInCents,
            createdAt: dbRate.createdAt,
            updatedAt: dbRate.updatedAt,
            // Assign mapped status object and its ID
            currentStatusId: currentStatusModel?.id ?? null,
            currentStatus: currentStatusModel,
        });

        return instance;
    }
} 