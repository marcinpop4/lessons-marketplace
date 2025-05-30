import { Student as DbStudent } from '@prisma/client';
import { Student } from '../../shared/models/Student.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for student mapper
const logger = createChildLogger('student-mapper');

/**
 * Maps between Prisma Student objects and shared Student models.
 */
export class StudentMapper {
    /**
     * Maps a Prisma Student object to a shared Student model instance.
     * Handles transformation and sanitization.
     * @param dbStudent The plain object returned by Prisma.
     * @returns A new instance of the shared Student model.
     */
    public static toModel(dbStudent: any): Student {
        try {
            const { id, firstName, lastName, email, phoneNumber, dateOfBirth: originalDateOfBirth, isActive, createdAt, updatedAt } = dbStudent;

            // Handle invalid dateOfBirth fallback (log warning)
            let safeDateOfBirth = originalDateOfBirth;
            if (!(originalDateOfBirth instanceof Date) || isNaN(originalDateOfBirth.getTime())) {
                logger.warn(`Invalid dateOfBirth received for student ${id}. Using current date as fallback.`);
                safeDateOfBirth = new Date(); // Fallback to current date
            }

            // Construct the shared model instance
            return new Student({
                id,
                firstName,
                lastName,
                email,
                phoneNumber,
                dateOfBirth: safeDateOfBirth,
                isActive: isActive ?? true, // Default to active if not specified
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined
            });
        } catch (error: unknown) {
            logger.error('Error in StudentMapper.toModel:', { error });
            throw new Error(`Failed to transform Student: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 