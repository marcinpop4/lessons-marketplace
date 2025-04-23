import { PrismaClient, Prisma, Teacher as DbTeacherPrisma, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate, Lesson as DbLesson, Student as DbStudent, Address as DbAddress, LessonRequest as DbLessonRequestPrisma, LessonQuote as DbLessonQuote, LessonStatus as DbLessonStatus, Goal as DbGoal } from '@prisma/client';
// Import shared models
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { Address } from '../../shared/models/Address.js';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { LessonStatus, LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { Goal } from '../../shared/models/Goal.js'; // Goal might be needed for stats or future methods
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { LessonType } from '../../shared/models/LessonType.js';
import * as bcrypt from 'bcrypt';
import prisma from '../prisma.js';
import { AppError, DuplicateEmailError } from '../errors/index.js'; // Import custom error


// Define more specific Prisma types with includes for transformation
type DbLessonWithRelations = DbLesson & {
    currentStatus: DbLessonStatus | null;
    // Update quote type to reflect full nesting needed for LessonQuote.fromDb
    quote: (DbLessonQuote & {
        teacher: DbTeacherPrisma & { teacherLessonHourlyRates?: DbTeacherLessonHourlyRate[] },
        lessonRequest: (DbLessonRequestPrisma & {
            student: DbStudent;
            address: DbAddress;
        })
    });
};

// Keep DbTeacherWithRates for other raw methods if needed
interface DbTeacherWithRates extends DbTeacherPrisma {
    teacherLessonHourlyRates: DbTeacherLessonHourlyRate[];
}


class TeacherService {
    private readonly prisma = prisma;

    /**
     * Create a new teacher
     * @param teacherData Teacher data including password
     * @returns Created teacher (shared model)
     */
    async create(teacherData: Prisma.TeacherCreateInput & { password: string }): Promise<Teacher> {
        try {
            const hashedPassword = await bcrypt.hash(teacherData.password, 10);
            const dbTeacher = await this.prisma.teacher.create({ data: { ...teacherData, password: hashedPassword, authMethods: ['PASSWORD'], isActive: true } });
            return Teacher.fromDb(dbTeacher);
        } catch (error) {
            // Check for Prisma unique constraint violation (P2002)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Check if the error target includes 'email' (more robust)
                const target = error.meta?.target as string[] | undefined;
                if (target && target.includes('email')) {
                    // Throw the specific custom error
                    throw new DuplicateEmailError(teacherData.email);
                }
            }
            // Log and re-throw other errors
            console.error('Error creating teacher:', error);
            throw error;
        }
    }

    // --- Refactored Methods --- 

    /**
     * Find teachers filtered by lesson type and limit.
     * Returns shared Teacher model instances.
     */
    async findTeachersByLessonType(lessonType: LessonType, limit: number): Promise<Teacher[]> {
        const dbTeachers = await this.prisma.teacher.findMany({
            where: {
                teacherLessonHourlyRates: {
                    some: { type: lessonType, deactivatedAt: null }
                }
            },
            include: {
                teacherLessonHourlyRates: {
                    where: { type: lessonType, deactivatedAt: null }
                }
            },
            take: limit
        });
        // Use Teacher.fromDb - Cast rates as they are included
        return dbTeachers.map(dbTeacher =>
            Teacher.fromDb(dbTeacher, dbTeacher.teacherLessonHourlyRates as DbTeacherLessonHourlyRate[])
        );
    }

    /**
     * Find a teacher by ID including all rates.
     * Returns shared Teacher model instance or null.
     */
    async findTeacherWithRatesById(teacherId: string): Promise<Teacher | null> {
        const dbTeacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
            include: {
                teacherLessonHourlyRates: true // Includes all rates, active and inactive
            }
        });
        if (!dbTeacher) {
            return null;
        }
        // Use Teacher.fromDb - Cast rates as they are included
        return Teacher.fromDb(dbTeacher, dbTeacher.teacherLessonHourlyRates as DbTeacherLessonHourlyRate[]);
    }

    /**
     * Find all lessons for a teacher, optionally filtered by student.
     * Returns transformed shared Lesson models.
     */
    async findLessonsByTeacherId(teacherId: string, studentId?: string): Promise<Lesson[]> {
        const dbLessons = await this.prisma.lesson.findMany({
            where: {
                quote: {
                    teacherId: teacherId,
                    lessonRequest: studentId ? { studentId } : undefined
                }
            },
            include: {
                quote: {
                    include: {
                        teacher: {
                            include: {
                                teacherLessonHourlyRates: true
                            }
                        },
                        lessonRequest: {
                            include: {
                                student: true,
                                address: true
                            }
                        }
                    }
                },
                currentStatus: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return dbLessons.map(dbLesson => Lesson.fromDb(dbLesson as DbLessonWithRelations)).filter(lesson => lesson !== null) as Lesson[];
    }

    /**
     * Get statistics for a teacher
     * @param teacherId The ID of the teacher
     * @returns Teacher statistics object (not a shared model, specific structure)
     */
    async getTeacherStatistics(teacherId: string): Promise<any> {
        const stats = await this.prisma.$transaction(async (tx) => {
            // Fetch lessons including quote for cost and lessonRequest for startTime
            const lessons = await tx.lesson.findMany({
                where: {
                    quote: { teacherId: teacherId }
                },
                include: {
                    currentStatus: true, // Needed for completedLessons count & totalEarnings
                    goals: {
                        include: {
                            currentStatus: true // Needed for completedGoals count
                        }
                    },
                    quote: { // Needed for totalEarnings
                        select: {
                            costInCents: true,
                            lessonRequest: { // Needed for upcomingLessons
                                select: {
                                    startTime: true
                                }
                            }
                        }
                    }
                }
            });

            const now = new Date();
            let upcomingLessons = 0;
            let totalEarnings = 0;
            let completedLessons = 0;

            lessons.forEach(lesson => {
                // Calculate completed lessons
                if (lesson.currentStatus?.status === LessonStatusValue.COMPLETED) {
                    completedLessons++;
                    // Calculate earnings only for completed lessons
                    totalEarnings += lesson.quote?.costInCents ?? 0;
                }
                // Calculate upcoming lessons (requires startTime from lessonRequest)
                if (lesson.quote?.lessonRequest?.startTime && lesson.quote.lessonRequest.startTime > now) {
                    upcomingLessons++;
                }
            });

            const totalLessons = lessons.length;
            const totalGoals = lessons.reduce((sum, lesson) => sum + lesson.goals.length, 0);
            const completedGoals = lessons.reduce((sum, lesson) =>
                sum + lesson.goals.filter(g => g.currentStatus?.status === 'COMPLETED').length, 0
            );

            // Return all calculated stats
            return {
                totalLessons,
                completedLessons,
                totalGoals,
                completedGoals,
                upcomingLessons, // Added
                totalEarnings,   // Added (in cents)
                completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
                goalsPerLesson: totalLessons > 0 ? totalGoals / totalLessons : 0,
                goalCompletionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
            };
        });

        return stats;
    }

}

// Export singleton instance
export const teacherService = new TeacherService(); 