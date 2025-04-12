import { PrismaClient } from '@prisma/client';
import { LessonStatusValue } from '@shared/models/LessonStatus';
import { v4 as uuidv4 } from 'uuid';

class LessonService {

    /**
     * Update the lesson's status by creating a new status record and updating the lesson's reference.
     * Handles the transaction internally.
     * @param prisma Prisma client instance
     * @param lessonId The ID of the lesson to update
     * @param newStatusValue The new status value
     * @param context Additional context about the status change
     * @returns The ID of the newly created status record.
     * @throws Error if the update fails
     */
    async updateStatus(
        prisma: PrismaClient,
        lessonId: string,
        newStatusValue: LessonStatusValue,
        context: Record<string, unknown> = {}
    ): Promise<string> {
        const newStatusId = uuidv4(); // Generate ID for the new status record

        // Use any casting to bypass TypeScript errors - consider defining Prisma Tx type if possible
        const client = prisma as any;

        try {
            await client.$transaction(async (tx: any) => {
                // Create the new status record
                await tx.lessonStatus.create({
                    data: {
                        id: newStatusId,
                        lessonId: lessonId,
                        status: newStatusValue,
                        context: context,
                        createdAt: new Date()
                    }
                });

                // Update the lesson to reference the new status
                // Ensure the lesson exists before trying to update
                const lessonExists = await tx.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
                if (!lessonExists) {
                    throw new Error(`Lesson with ID ${lessonId} not found.`);
                }

                await tx.lesson.update({
                    where: { id: lessonId },
                    data: {
                        currentStatusId: newStatusId
                    }
                });
            });

            return newStatusId; // Return the ID of the new status

        } catch (error) {
            console.error(`Error updating status for lesson ${lessonId} to ${newStatusValue}:`, error);
            // Rethrow or handle error appropriately
            throw new Error(`Failed to update lesson status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods for LessonService ---
    // async getLessonById(lessonId: string): Promise<Lesson | null> { ... }
    // async createLesson(quoteId: string): Promise<Lesson> { ... } 
    // etc.
}

// Export a singleton instance
export const lessonService = new LessonService(); 