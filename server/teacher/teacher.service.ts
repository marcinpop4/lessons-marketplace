import prisma from '../prisma.js';
import { Lesson, LessonQuote, LessonRequest, Teacher, Student, Address, LessonStatus } from '@prisma/client';
import { LessonStatusValue } from '../../shared/models/LessonStatus.js';

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

    /**
     * Find all lessons associated with a specific teacher, including details
     * about the quote, student, and current status.
     * @param teacherId The ID of the teacher
     * @returns A promise that resolves to an array of lessons with details.
     */
    async findLessonsByTeacherId(teacherId: string): Promise<FullLessonDetails[]> {
        console.log(`[SERVICE] Fetching lessons for teacher ID: ${teacherId}`);
        try {
            const lessons = await prisma.lesson.findMany({
                where: {
                    quote: { teacherId: teacherId }
                },
                include: {
                    currentStatus: true,
                    quote: {
                        include: {
                            // Select specific teacher fields, excluding password
                            teacher: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phoneNumber: true,
                                    dateOfBirth: true,
                                    isActive: true,
                                    // Explicitly EXCLUDE password
                                    // password: false, // Not valid Prisma syntax, just omit it
                                    createdAt: true,
                                    updatedAt: true
                                }
                            },
                            lessonRequest: {
                                include: {
                                    // Select specific student fields, excluding password
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

            console.log(`[SERVICE] Found ${lessons.length} lessons for teacher ID: ${teacherId}`);
            if (!Array.isArray(lessons)) {
                console.error('[SERVICE] Prisma did not return an array!', lessons);
                throw new Error('Database query returned unexpected data format.');
            }
            // Revert cast to original type
            return lessons as FullLessonDetails[];
        } catch (error) {
            console.error(`[SERVICE] Error fetching lessons for teacher ${teacherId}:`, error);
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