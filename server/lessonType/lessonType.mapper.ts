import { LessonType } from '../../shared/models/LessonType.js';

/**
 * Maps between database LessonType values and shared LessonType enum.
 */
export class LessonTypeMapper {
    /**
     * Maps a database lesson type string to the shared LessonType enum.
     * @param dbLessonType The lesson type string from database.
     * @returns The corresponding LessonType enum value.
     * @throws Error if the type is not valid.
     */
    public static toModel(dbLessonType: string): LessonType {
        // Ensure the type exists in the enum
        if (Object.values(LessonType).includes(dbLessonType as LessonType)) {
            return dbLessonType as LessonType;
        }
        throw new Error(`Invalid lesson type: ${dbLessonType}`);
    }
} 