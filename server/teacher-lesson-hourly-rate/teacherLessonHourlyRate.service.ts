import { TeacherLessonHourlyRate as PrismaTeacherLessonHourlyRate, LessonType, Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { TeacherLessonHourlyRateMapper } from './teacher-lesson-hourly-rate.mapper.js';

// Define simple error messages for service layer exceptions
const Errors = {
    MISSING_DATA: 'Missing or invalid data for creating/updating hourly rate.',
    TEACHER_NOT_FOUND: 'Teacher not found.',
    RATE_NOT_FOUND_OR_ACCESS_DENIED: 'Lesson rate not found or access denied.',
    RATE_ALREADY_DEACTIVATED: 'Lesson rate is already deactivated.',
    RATE_ALREADY_ACTIVE: 'Lesson rate is already active.',
    RATE_CONFLICT_ACTIVE: (type: LessonType) => `Another rate for type ${type} is already active. Deactivate it first.`,
    DATABASE_ERROR: 'Database error occurred.', // Generic DB error
    TRANSACTION_ERROR: 'Database transaction failed.'
};

class TeacherLessonHourlyRateService {

    /**
     * Finds an existing active rate for the teacher and type, or creates a new one.
     * Handles deactivation/reactivation logic internally based on existing rates.
     * @throws Error with specific messages (e.g., Errors.TEACHER_NOT_FOUND)
     */
    async findOrCreateOrUpdate(teacherId: string, type: LessonType, rateInCents: number): Promise<TeacherLessonHourlyRate> {
        if (!teacherId || !type || rateInCents == null || rateInCents <= 0) {
            throw new Error(Errors.MISSING_DATA);
        }

        try {
            const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
            if (!teacher) {
                throw new Error(Errors.TEACHER_NOT_FOUND);
            }

            // Transaction to ensure atomicity
            const resultRate = await prisma.$transaction(async (tx) => {
                const existingRates = await tx.teacherLessonHourlyRate.findMany({
                    where: { teacherId: teacherId, type: type },
                    orderBy: { createdAt: 'desc' }
                });

                const activeRate = existingRates.find(rate => rate.deactivatedAt === null);
                const latestInactiveRate = existingRates.find(rate => rate.deactivatedAt !== null);

                let finalRate: PrismaTeacherLessonHourlyRate;

                if (activeRate) {
                    if (activeRate.rateInCents !== rateInCents) {
                        await tx.teacherLessonHourlyRate.update({
                            where: { id: activeRate.id },
                            data: { deactivatedAt: new Date() }
                        });
                        finalRate = await tx.teacherLessonHourlyRate.create({
                            data: { teacherId, type, rateInCents }
                        });
                    } else {
                        finalRate = activeRate;
                    }
                } else if (latestInactiveRate) {
                    finalRate = await tx.teacherLessonHourlyRate.update({
                        where: { id: latestInactiveRate.id },
                        data: { rateInCents, deactivatedAt: null }
                    });
                } else {
                    finalRate = await tx.teacherLessonHourlyRate.create({
                        data: { teacherId, type, rateInCents }
                    });
                }
                return finalRate;
            }, {
                // Add timeout to the transaction options if needed, though default should be okay
                // timeout: 10000, 
            });

            return TeacherLessonHourlyRateMapper.toModel(resultRate);

        } catch (error) {
            console.error('[Service Error] findOrCreateOrUpdate:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error(`Prisma Error Code: ${error.code}`);
                // Translate specific Prisma errors to more meaningful generic errors
                if (error.code === 'P2002') {
                    throw new Error('Conflict: Operation resulted in a duplicate rate.');
                } else if (error.code === 'P2025') {
                    // This might indicate the activeRate.id was invalid if update failed
                    throw new Error(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
                } else {
                    // Other Prisma known errors
                    throw new Error(Errors.DATABASE_ERROR);
                }
            } else if (error instanceof Error && Object.values(Errors).includes(error.message)) {
                throw error; // Re-throw known service errors (like TEACHER_NOT_FOUND)
            } else {
                throw new Error(Errors.DATABASE_ERROR); // Default to generic DB error for unknown issues
            }
        }
    }

    /**
     * Deactivates an hourly rate for a specific teacher.
     * @throws Error with specific messages (e.g., Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED)
     */
    async deactivate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        try {
            const rate = await prisma.teacherLessonHourlyRate.findUnique({
                where: { id: rateId }
            });

            if (!rate || rate.teacherId !== teacherId) {
                throw new Error(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
            }

            if (rate.deactivatedAt !== null) {
                throw new Error(Errors.RATE_ALREADY_DEACTIVATED);
            }

            const updatedRate = await prisma.teacherLessonHourlyRate.update({
                where: { id: rateId },
                data: { deactivatedAt: new Date() }
            });

            return TeacherLessonHourlyRateMapper.toModel(updatedRate);
        } catch (error) {
            console.error('[Service Error] deactivate:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error(`Prisma Error Code: ${error.code}`);
                if (error.code === 'P2025') {
                    throw new Error(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
                } else {
                    throw new Error(Errors.DATABASE_ERROR);
                }
            } else if (error instanceof Error && Object.values(Errors).includes(error.message)) {
                throw error; // Re-throw known service errors
            } else {
                throw new Error(Errors.DATABASE_ERROR);
            }
        }
    }

    /**
     * Reactivates a previously deactivated hourly rate for a specific teacher.
     * @throws Error with specific messages (e.g., Errors.RATE_ALREADY_ACTIVE)
     */
    async reactivate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        try {
            const rateToReactivate = await prisma.teacherLessonHourlyRate.findUnique({
                where: { id: rateId }
            });

            if (!rateToReactivate || rateToReactivate.teacherId !== teacherId) {
                throw new Error(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
            }

            if (rateToReactivate.deactivatedAt === null) {
                throw new Error(Errors.RATE_ALREADY_ACTIVE);
            }

            const reactivatedRate = await prisma.$transaction(async (tx) => {
                const currentlyActiveRate = await tx.teacherLessonHourlyRate.findFirst({
                    where: {
                        teacherId: teacherId,
                        type: rateToReactivate.type,
                        deactivatedAt: null,
                        NOT: { id: rateId }
                    }
                });

                if (currentlyActiveRate) {
                    throw new Error(Errors.RATE_CONFLICT_ACTIVE(rateToReactivate.type));
                }

                return await tx.teacherLessonHourlyRate.update({
                    where: { id: rateId },
                    data: { deactivatedAt: null }
                });
            });

            return TeacherLessonHourlyRateMapper.toModel(reactivatedRate);
        } catch (error) {
            console.error('[Service Error] reactivate:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error(`Prisma Error Code: ${error.code}`);
                if (error.code === 'P2025') {
                    throw new Error(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
                } else {
                    throw new Error(Errors.DATABASE_ERROR);
                }
            } else if (error instanceof Error && Object.values(Errors).includes(error.message) || error instanceof Error && error.message.startsWith('Another rate for type')) {
                // Re-throw known service errors (including the dynamic conflict message)
                throw error;
            } else {
                throw new Error(Errors.DATABASE_ERROR);
            }
        }
    }

    // Removed old create method
}

export const teacherLessonHourlyRateService = new TeacherLessonHourlyRateService();