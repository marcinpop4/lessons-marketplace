import prisma from '../prisma.js';
import { Lesson, LessonQuote, LessonRequest, Teacher, Student, Address, LessonStatus, Prisma, PrismaClient } from '@prisma/client';
import { LessonStatusValue } from '../../shared/models/LessonStatus.js';
import bcryptjs from 'bcryptjs';

// Type representing a full Lesson object with related data for display
// We need the student name, lesson time/duration/address/cost, and current status.
export type FullLessonDetails = Lesson & {
    currentStatus: LessonStatus | null;
    quote: LessonQuote & {
        teacher: Teacher;
        lessonRequest: LessonRequest & {
            student: Student;
            address: Address;
        }
    }
};

export class TeacherService {

    private readonly saltRounds = 10;

    /**
     * Creates a new teacher, hashing their password.
     * @param prisma Prisma client instance
     * @param teacherData Data for the new teacher, including a plain text password.
     * @returns The created teacher object (excluding password).
     * @throws Error if creation fails.
     */
    async create(prisma: PrismaClient, teacherData: Prisma.TeacherCreateInput & { password: string }): Promise<Omit<Teacher, 'password'> | null> {
        try {
            const { password, ...restData } = teacherData;

            if (!password) {
                throw new Error('Password is required to create a teacher.');
            }

            const hashedPassword = await bcryptjs.hash(password, this.saltRounds);

            const newTeacher = await prisma.teacher.create({
                data: {
                    ...restData,
                    password: hashedPassword,
                    authMethods: ['PASSWORD'],
                    isActive: true
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    dateOfBirth: true,
                    isActive: true,
                    authMethods: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            return newTeacher;
        } catch (error) {
            console.error('Error creating teacher:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new Error(`Teacher with email ${teacherData.email} already exists.`);
            }
            throw new Error(`Failed to create teacher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find all lessons associated with a specific teacher, including details
     * about the quote, student, and current status.
     * @param teacherId The ID of the teacher
     * @returns A promise that resolves to an array of lessons with details.
     */
    async findLessonsByTeacherId(teacherId: string): Promise<FullLessonDetails[]> {
        try {
            const lessons = await prisma.lesson.findMany({
                where: {
                    quote: { teacherId: teacherId }
                },
                include: {
                    currentStatus: true,
                    quote: {
                        include: {
                            teacher: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phoneNumber: true,
                                    dateOfBirth: true,
                                    isActive: true,
                                    createdAt: true,
                                    updatedAt: true
                                }
                            },
                            lessonRequest: {
                                include: {
                                    student: {
                                        select: {
                                            id: true,
                                            firstName: true,
                                            lastName: true,
                                            email: true,
                                            phoneNumber: true,
                                            dateOfBirth: true,
                                            isActive: true,
                                            createdAt: true,
                                            updatedAt: true
                                        }
                                    },
                                    address: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    quote: {
                        lessonRequest: { startTime: 'desc' }
                    }
                }
            });

            if (!Array.isArray(lessons)) {
                throw new Error('Database query returned unexpected data format.');
            }
            // Revert cast to original type
            return lessons as FullLessonDetails[];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Calculate statistics for a given teacher.
     * @param teacherId The ID of the teacher.
     * @returns Teacher statistics.
     */
    async getTeacherStatistics(teacherId: string): Promise<any> { // Replace 'any' with a specific stats type
        console.log(`Fetching statistics for teacher ID: ${teacherId}`);

        // Using a transaction ensures data consistency for calculations
        const stats = await prisma.$transaction(async (tx) => {
            // Fetch all lessons related to the teacher via their quotes
            const lessons = await tx.lesson.findMany({
                where: {
                    quote: {
                        teacherId: teacherId
                    }
                },
                include: {
                    currentStatus: true, // Need status for filtering
                    quote: {
                        include: {
                            lessonRequest: true // Need start time from request
                        }
                    }
                }
            });

            // Calculate statistics based on the fetched lessons
            const totalLessons = lessons.length;
            const completedLessons = lessons.filter(l => l.currentStatus?.status === LessonStatusValue.COMPLETED).length;
            const upcomingLessons = lessons.filter(l => l.quote.lessonRequest.startTime > new Date()).length;

            // Example: Total earnings calculation (sum of costInCents from completed lessons' quotes)
            // Note: This requires fetching costInCents from the quote if not already included.
            // For simplicity, let's assume costInCents is available or fetched separately if needed.
            // Fetching quotes again or modifying the include above might be necessary.
            const completedLessonIds = lessons
                .filter(l => l.currentStatus?.status === LessonStatusValue.COMPLETED)
                .map(l => l.id);

            const completedQuotes = await tx.lessonQuote.findMany({
                where: {
                    Lesson: {
                        id: { in: completedLessonIds }
                    }
                }
            });
            const totalEarnings = completedQuotes.reduce((sum, quote) => sum + quote.costInCents, 0);

            return {
                totalLessons,
                completedLessons,
                upcomingLessons,
                totalEarnings,
                // Add other stats as needed (e.g., total rejected, requested, accepted)
            };
        });

        console.log(`Calculated statistics for teacher ID: ${teacherId}`, stats);
        return stats;
    }

    // Add other teacher-related service methods here...
}

// Export a singleton instance with the expected name
export const teacherService = new TeacherService(); 