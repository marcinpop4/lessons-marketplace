import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js'; // Adjust path if needed

class UtilService {
    private readonly prisma: PrismaClient = prisma;

    /**
     * Clears relevant data from the database in the correct order to avoid constraint violations.
     * Uses direct Prisma access specifically for this seed/testing cleanup task.
     */
    async clearDatabase(): Promise<void> {
        console.log('Clearing database...');
        try {
            await this.prisma.$transaction([
                // Delete records that depend on others first
                // Status tables
                this.prisma.goalStatus.deleteMany(),
                this.prisma.lessonStatus.deleteMany(),
                this.prisma.lessonQuoteStatus.deleteMany(),
                this.prisma.teacherLessonHourlyRateStatus.deleteMany(), // Added this
                this.prisma.objectiveStatus.deleteMany(), // Keep if objectives exist

                // Core dependency chain
                this.prisma.goal.deleteMany(),         // Depends on Lesson
                this.prisma.objective.deleteMany(),   // Keep if objectives exist
                this.prisma.lesson.deleteMany(),       // Depends on LessonQuote
                this.prisma.lessonQuote.deleteMany(),    // Depends on LessonRequest, Teacher
                this.prisma.lessonRequest.deleteMany(),  // Depends on Student, Address

                // Teacher rates
                this.prisma.teacherLessonHourlyRate.deleteMany(), // Depends on Teacher

                // Auth-related tables
                this.prisma.userAuthMethod.deleteMany(), // Depends on User
                this.prisma.passwordCredential.deleteMany(), // Depends on UserAuthMethod
                this.prisma.refreshToken.deleteMany(),      // Depends on User

                // Base user/profile tables last
                this.prisma.address.deleteMany(),
                this.prisma.teacher.deleteMany(),
                this.prisma.student.deleteMany(),
            ]);
            console.log('Database cleared successfully.');
        } catch (error) {
            console.error("Error clearing database:", error);
            throw new Error(`Database clearing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Export a singleton instance
export const utilService = new UtilService(); 