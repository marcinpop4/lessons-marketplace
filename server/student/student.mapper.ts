import type { Student as DbStudent } from '@prisma/client';
import { Student } from '../../shared/models/Student.js';

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
            const { id, firstName, lastName, email, phoneNumber, dateOfBirth, isActive, createdAt, updatedAt } = dbStudent;

            // Ensure date is a Date object
            const safeDateOfBirth = dateOfBirth ? new Date(dateOfBirth) : new Date(); // Provide a default if null/undefined
            if (isNaN(safeDateOfBirth.getTime())) {
                console.warn(`Invalid dateOfBirth received for student ${id}. Using current date as fallback.`);
            }

            // Construct the shared model instance
            return new Student({
                id,
                firstName,
                lastName,
                email,
                phoneNumber,
                dateOfBirth: safeDateOfBirth, // Use safe date
                isActive: isActive ?? true, // Default to active if not specified
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined
            });
        } catch (error: unknown) {
            console.error('Error in StudentMapper.toModel:', error);
            throw new Error(`Failed to transform Student: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 