import { PrismaClient, TeacherLessonHourlyRate, LessonType } from '@prisma/client';
import { Prisma } from '@prisma/client';

class TeacherLessonHourlyRateService {

    /**
     * Creates a new hourly rate for a teacher and lesson type.
     * @param prisma Prisma client instance
     * @param rateData Data for the new rate, expecting teacherId for connection.
     * @returns The created rate object.
     * @throws Error if creation fails (e.g., unique constraint violation).
     */
    async create(prisma: PrismaClient, rateData: { teacherId: string, type: LessonType, rateInCents: number }): Promise<TeacherLessonHourlyRate | null> {
        try {
            const { teacherId, type, rateInCents } = rateData;

            // Basic validation 
            if (!teacherId || !type || rateInCents == null || rateInCents < 0) {
                throw new Error('Missing or invalid data for creating hourly rate.');
            }

            // Use Prisma.TeacherLessonHourlyRateCreateInput structure internally
            const createInput: Prisma.TeacherLessonHourlyRateCreateInput = {
                teacher: { // Connect via relation
                    connect: { id: teacherId }
                },
                type: type,
                rateInCents: rateInCents
            };

            const newRate = await prisma.teacherLessonHourlyRate.create({
                data: createInput
            });
            return newRate;
        } catch (error) {
            console.error('Error creating teacher hourly rate:', error);
            // Handle potential unique constraint errors specifically if needed
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Use the input data for the error message
                throw new Error(`Rate already exists for teacher ${rateData.teacherId} and type ${rateData.type}.`);
            }
            throw new Error(`Failed to create teacher hourly rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods ---
    // async findByTeacherAndType(prisma: PrismaClient, teacherId: string, type: LessonType): Promise<TeacherLessonHourlyRate | null> { ... }
    // async updateRate(prisma: PrismaClient, id: string, rateInCents: number): Promise<TeacherLessonHourlyRate | null> { ... }
    // async deactivateRate(prisma: PrismaClient, id: string): Promise<TeacherLessonHourlyRate | null> { ... }
}

export const teacherLessonHourlyRateService = new TeacherLessonHourlyRateService();