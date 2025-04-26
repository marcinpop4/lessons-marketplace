import { PrismaClient, Prisma, Teacher as DbTeacher, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate, Lesson as DbLesson, Student as DbStudent, Address as DbAddress, LessonRequest as DbLessonRequestPrisma, LessonQuote as DbLessonQuote, LessonStatus as DbLessonStatus, Goal as DbGoal, AuthMethod, UserType } from '@prisma/client';
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
import prisma from '../prisma.js';
import { AppError, DuplicateEmailError } from '../errors/index.js'; // Import custom error
import { TeacherMapper } from './teacher.mapper.js';
import { TeacherLessonHourlyRateMapper } from '../teacher-lesson-hourly-rate/teacher-lesson-hourly-rate.mapper.js';
import { LessonMapper } from '../lesson/lesson.mapper.js';

// Define the type for the Prisma client or transaction client
// Use Prisma.TransactionClient for the interactive transaction type
type PrismaTransactionClient = Prisma.TransactionClient;

// Define more specific Prisma types with includes for transformation
type DbLessonWithRelations = Prisma.LessonGetPayload<{
    include: {
        currentStatus: true,
        quote: {
            include: {
                teacher: { include: { teacherLessonHourlyRates: true } },
                lessonRequest: { include: { student: true, address: true } }
            }
        }
    }
}>;

// Keep DbTeacherWithRates for other raw methods if needed
interface DbTeacherWithRates extends DbTeacher {
    teacherLessonHourlyRates: DbTeacherLessonHourlyRate[];
}

// DTO for creating a new teacher (no password)
interface TeacherCreateDTO {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: Date;
}

class TeacherService {
    private readonly prisma = prisma;

    /**
     * Create a new teacher profile (no password handling).
     * Optionally accepts a transactional Prisma client.
     * @param teacherCreateDTO Teacher profile data
     * @param client Optional Prisma client (transactional or default).
     * @returns Created teacher (shared model)
     */
    async create(
        teacherCreateDTO: TeacherCreateDTO,
        client: PrismaTransactionClient | PrismaClient = this.prisma // Accept optional client
    ): Promise<Teacher | null> {
        try {
            // Use the provided client (tx or default prisma)
            const dbTeacher = await client.teacher.create({
                data: {
                    ...teacherCreateDTO, // Save only profile data
                }
            });

            // Use TeacherMapper to transform the result
            return TeacherMapper.toModel(dbTeacher);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = error.meta?.target as string[] | undefined;
                if (target && target.includes('email')) {
                    throw new DuplicateEmailError(teacherCreateDTO.email);
                }
            }
            console.error('Error creating teacher profile:', error);
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
        // FIXED: Use TeacherMapper.toModel
        return dbTeachers.map(dbTeacher =>
            TeacherMapper.toModel(dbTeacher, dbTeacher.teacherLessonHourlyRates)
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
        // FIXED: Use TeacherMapper.toModel
        return TeacherMapper.toModel(dbTeacher, dbTeacher.teacherLessonHourlyRates);
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

        // Use LessonMapper to transform and filter out nulls
        return dbLessons
            .map(lesson => LessonMapper.toModel(lesson as DbLessonWithRelations))
            .filter((lesson): lesson is Lesson => lesson !== null);
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

    /**
     * Find a teacher by ID
     * @param id The ID of the teacher to find
     * @returns The teacher if found, null otherwise
     */
    async findById(id: string): Promise<Teacher | null> {
        try {
            const teacherDb = await this.prisma.teacher.findUnique({
                where: { id },
            });

            if (!teacherDb) {
                return null;
            }

            return TeacherMapper.toModel(teacherDb);
        } catch (error) {
            console.error('Error finding teacher:', error);
            throw error;
        }
    }

    /**
     * Find a teacher by email.
     * @param email Teacher email
     * @returns Prisma Teacher database model or null if not found
     */
    async findByEmail(email: string): Promise<DbTeacher | null> {
        try {
            return this.prisma.teacher.findUnique({
                where: { email }
            });
        } catch (error) {
            console.error('Error finding teacher by email:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const teacherService = new TeacherService(); 