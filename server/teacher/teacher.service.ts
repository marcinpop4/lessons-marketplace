import { PrismaClient, Prisma, Teacher as DbTeacher, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate, Lesson as DbLesson, Student as DbStudent, Address as DbAddress, LessonRequest as DbLessonRequestPrisma, LessonQuote as DbLessonQuote, LessonStatus as DbLessonStatus, Goal as DbGoal, AuthMethod, UserType } from '@prisma/client';
// Import shared models using alias and no extension
import { Teacher } from '@shared/models/Teacher';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';
import { Lesson, DbLessonWithNestedRelations } from '@shared/models/Lesson';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonStatus, LessonStatusValue } from '@shared/models/LessonStatus';
import { Goal } from '@shared/models/Goal';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate';
import { LessonType } from '@shared/models/LessonType';
import { TeacherLessonHourlyRateStatusValue } from '@shared/models/TeacherLessonHourlyRateStatus';

// Local imports with .js extension
import prisma from '../prisma.js';
import { AppError, DuplicateEmailError, NotFoundError } from '../errors/index.js';
import { TeacherMapper } from './teacher.mapper.js';
import { TeacherLessonHourlyRateMapper } from '../teacher-lesson-hourly-rate/teacher-lesson-hourly-rate.mapper.js';
import { LessonMapper } from '../lesson/lesson.mapper.js';

// Define the type for the Prisma client or transaction client
// Use Prisma.TransactionClient for the interactive transaction type
type PrismaTransactionClient = Prisma.TransactionClient;

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
     * Returns shared Teacher model instances including their ACTIVE rates.
     */
    async findTeachersByLessonType(lessonType: LessonType, limit: number): Promise<Teacher[]> {
        const dbTeachers = await this.prisma.teacher.findMany({
            where: {
                // Filter teachers who have *at least one* ACTIVE rate for the given type
                teacherLessonHourlyRates: {
                    some: {
                        type: lessonType,
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    }
                }
            },
            include: {
                // Include only the ACTIVE rates for the specified type along with their status
                teacherLessonHourlyRates: {
                    where: {
                        type: lessonType,
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    },
                    include: { currentStatus: true } // Need to include the status object for mapping
                }
            },
            take: limit
        });

        // Map using the updated TeacherMapper logic (which will use the Rate mapper)
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
     * Get a specific teacher by ID, including their ACTIVE lesson rates.
     * @param id The ID of the teacher.
     * @returns The teacher's full shared model.
     * @throws NotFoundError if the teacher is not found.
     */
    async getTeacherById(id: string): Promise<Teacher> {
        const dbTeacher = await this.prisma.teacher.findUnique({
            where: { id },
            include: {
                // Include only ACTIVE rates, but fetch their status object too
                teacherLessonHourlyRates: {
                    where: {
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    },
                    include: { currentStatus: true }
                }
            }
        });

        if (!dbTeacher) {
            throw new NotFoundError(`Teacher with ID ${id} not found.`);
        }

        // Map using the updated TeacherMapper logic
        return TeacherMapper.toModel(dbTeacher, dbTeacher.teacherLessonHourlyRates);
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

    /**
     * Find a teacher by ID including ONLY their ACTIVE rates.
     * @param id The ID of the teacher to find
     * @returns The teacher shared model if found, null otherwise
     * @deprecated Use getTeacherById which throws NotFoundError, or adjust as needed.
     */
    async findById(id: string): Promise<Teacher | null> {
        try {
            const teacherDb = await this.prisma.teacher.findUnique({
                where: { id },
                include: {
                    // Update to fetch ACTIVE rates via status
                    teacherLessonHourlyRates: {
                        where: {
                            currentStatus: {
                                status: TeacherLessonHourlyRateStatusValue.ACTIVE
                            }
                        },
                        include: { currentStatus: true }
                    }
                }
            });

            if (!teacherDb) {
                return null;
            }

            // Map using the updated TeacherMapper logic
            return TeacherMapper.toModel(teacherDb, teacherDb.teacherLessonHourlyRates);
        } catch (error) {
            console.error('Error finding teacher:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const teacherService = new TeacherService(); 