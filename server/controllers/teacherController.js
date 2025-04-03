import prisma from '../prisma.js';
import { LessonType } from '@shared/models/LessonType.js';
/**
 * Controller for teacher-related operations
 */
export const teacherController = {
    /**
     * Get teachers filtered by lesson type and limit
     * @param req Request - can include lessonType and limit query parameters
     * @param res Response
     * @param next NextFunction
     */
    getTeachers: async (req, res, next) => {
        try {
            const { lessonType, limit } = req.query;
            // Validate lessonType is provided and valid
            if (!lessonType) {
                res.status(400).json({ message: 'Lesson type is required' });
                return;
            }
            // Check if the provided lessonType is valid
            if (!Object.values(LessonType).includes(lessonType)) {
                res.status(400).json({
                    message: `Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`
                });
                return;
            }
            // Parse and validate limit parameter
            if (!limit) {
                res.status(400).json({ message: 'Limit parameter is required' });
                return;
            }
            if (!/^\d+$/.test(limit)) {
                res.status(400).json({ message: 'Limit must be a positive number' });
                return;
            }
            const limitValue = Number(limit);
            if (limitValue < 1) {
                res.status(400).json({ message: 'Limit must be a positive number' });
                return;
            }
            try {
                // Execute the query
                const teachers = await prisma.$transaction(async (tx) => {
                    const query = {
                        where: {
                            teacherLessonHourlyRates: {
                                some: {
                                    type: lessonType,
                                    deactivatedAt: null
                                }
                            }
                        },
                        include: {
                            teacherLessonHourlyRates: {
                                where: {
                                    type: lessonType,
                                    deactivatedAt: null
                                }
                            }
                        },
                        take: limitValue
                    };
                    return await tx.teacher.findMany(query);
                });
                // Transform the data to match the expected frontend format
                const transformedTeachers = teachers.map((teacher) => {
                    // Create a map of lesson types to rates
                    const lessonHourlyRates = {};
                    // Populate the rates map
                    teacher.teacherLessonHourlyRates.forEach((rate) => {
                        lessonHourlyRates[rate.type] = rate.rateInCents;
                    });
                    return {
                        id: teacher.id,
                        firstName: teacher.firstName,
                        lastName: teacher.lastName,
                        email: teacher.email,
                        phoneNumber: teacher.phoneNumber,
                        dateOfBirth: teacher.dateOfBirth.toISOString(),
                        lessonHourlyRates
                    };
                });
                res.status(200).json(transformedTeachers);
            }
            catch (dbError) {
                console.error('Database error:', dbError);
                res.status(500).json({
                    message: 'Database error occurred while fetching teachers',
                    error: dbError instanceof Error ? dbError.message : 'Unknown database error'
                });
            }
        }
        catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({
                message: 'An error occurred while fetching teachers',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Get a teacher's profile including all lesson rates (active and inactive)
     * @param req Request - must include teacherId parameter
     * @param res Response
     * @param next NextFunction
     */
    getTeacherProfile: async (req, res, next) => {
        try {
            // Get the teacher ID from the authenticated user
            const teacherId = req.user?.id;
            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const teacher = await prisma.teacher.findUnique({
                where: { id: teacherId },
                include: {
                    teacherLessonHourlyRates: true
                }
            });
            if (!teacher) {
                res.status(404).json({ message: 'Teacher not found' });
                return;
            }
            // Transform the data to include active status
            const transformedTeacher = {
                id: teacher.id,
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                email: teacher.email,
                phoneNumber: teacher.phoneNumber,
                dateOfBirth: teacher.dateOfBirth.toISOString(),
                lessonRates: teacher.teacherLessonHourlyRates.map((rate) => ({
                    id: rate.id,
                    type: rate.type,
                    rateInCents: rate.rateInCents,
                    isActive: rate.deactivatedAt === null,
                    deactivatedAt: rate.deactivatedAt ? rate.deactivatedAt.toISOString() : null,
                    createdAt: rate.createdAt.toISOString(),
                    updatedAt: rate.updatedAt.toISOString()
                }))
            };
            res.status(200).json(transformedTeacher);
        }
        catch (error) {
            console.error('Error fetching teacher profile:', error);
            res.status(500).json({
                message: 'An error occurred while fetching teacher profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Create or update a lesson hourly rate for a teacher
     * @param req Request - must include lessonType and rateInCents in body
     * @param res Response
     * @param next NextFunction
     */
    createOrUpdateLessonRate: async (req, res, next) => {
        try {
            // Get the teacher ID from the authenticated user
            const teacherId = req.user?.id;
            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { lessonType, rateInCents, id } = req.body;
            // Validate inputs
            if (!lessonType || !Object.values(LessonType).includes(lessonType)) {
                res.status(400).json({
                    message: `Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`
                });
                return;
            }
            if (!rateInCents || isNaN(rateInCents) || rateInCents <= 0) {
                res.status(400).json({ message: 'Rate must be a positive number' });
                return;
            }
            // Check if the teacher exists
            const teacher = await prisma.teacher.findUnique({
                where: { id: teacherId }
            });
            if (!teacher) {
                res.status(404).json({ message: 'Teacher not found' });
                return;
            }
            // If we have an ID, we're updating an existing rate
            if (id) {
                // Verify the rate exists and belongs to this teacher
                const existingRate = await prisma.teacherLessonHourlyRate.findFirst({
                    where: {
                        id,
                        teacherId
                    }
                });
                if (!existingRate) {
                    res.status(404).json({ message: 'Rate not found or does not belong to you' });
                    return;
                }
                // Update the rate
                const updatedRate = await prisma.teacherLessonHourlyRate.update({
                    where: {
                        id
                    },
                    data: {
                        rateInCents,
                        deactivatedAt: null // Ensure it's active when updated
                    }
                });
                res.status(200).json({
                    id: updatedRate.id,
                    type: updatedRate.type,
                    rateInCents: updatedRate.rateInCents,
                    isActive: true,
                    deactivatedAt: null,
                    createdAt: updatedRate.createdAt.toISOString(),
                    updatedAt: updatedRate.updatedAt.toISOString()
                });
                return;
            }
            // Check if the rate already exists for this lesson type when creating new
            const existingRate = await prisma.teacherLessonHourlyRate.findUnique({
                where: {
                    teacherId_type: {
                        teacherId,
                        type: lessonType
                    }
                }
            });
            // If we're creating a new rate and the rate already exists
            if (existingRate) {
                res.status(409).json({
                    message: `You already have a rate for ${lessonType} lessons. Please edit the existing rate instead.`
                });
                return;
            }
            // Create a new hourly rate
            const hourlyRate = await prisma.teacherLessonHourlyRate.create({
                data: {
                    teacherId,
                    type: lessonType,
                    rateInCents
                }
            });
            res.status(200).json({
                id: hourlyRate.id,
                type: hourlyRate.type,
                rateInCents: hourlyRate.rateInCents,
                isActive: true,
                deactivatedAt: null,
                createdAt: hourlyRate.createdAt.toISOString(),
                updatedAt: hourlyRate.updatedAt.toISOString()
            });
        }
        catch (error) {
            console.error('Error creating/updating lesson rate:', error);
            res.status(500).json({
                message: 'An error occurred while creating/updating lesson rate',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Deactivate a lesson hourly rate for a teacher
     * @param req Request - must include lessonType in body
     * @param res Response
     * @param next NextFunction
     */
    deactivateLessonRate: async (req, res, next) => {
        try {
            // Get the teacher ID from the authenticated user
            const teacherId = req.user?.id;
            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { lessonType } = req.body;
            // Validate inputs
            if (!lessonType || !Object.values(LessonType).includes(lessonType)) {
                res.status(400).json({
                    message: `Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`
                });
                return;
            }
            // Find the hourly rate
            const hourlyRate = await prisma.teacherLessonHourlyRate.findUnique({
                where: {
                    teacherId_type: {
                        teacherId,
                        type: lessonType
                    }
                }
            });
            if (!hourlyRate) {
                res.status(404).json({ message: 'Lesson rate not found' });
                return;
            }
            // Deactivate the hourly rate
            const updatedRate = await prisma.teacherLessonHourlyRate.update({
                where: {
                    id: hourlyRate.id
                },
                data: {
                    deactivatedAt: new Date()
                }
            });
            res.status(200).json({
                id: updatedRate.id,
                type: updatedRate.type,
                rateInCents: updatedRate.rateInCents,
                isActive: false,
                deactivatedAt: updatedRate.deactivatedAt?.toISOString(),
                createdAt: updatedRate.createdAt.toISOString(),
                updatedAt: updatedRate.updatedAt.toISOString()
            });
        }
        catch (error) {
            console.error('Error deactivating lesson rate:', error);
            res.status(500).json({
                message: 'An error occurred while deactivating lesson rate',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Reactivate a previously deactivated lesson hourly rate
     * @param req Request - must include lessonType in body
     * @param res Response
     * @param next NextFunction
     */
    reactivateLessonRate: async (req, res, next) => {
        try {
            // Get the teacher ID from the authenticated user
            const teacherId = req.user?.id;
            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { lessonType } = req.body;
            // Validate inputs
            if (!lessonType || !Object.values(LessonType).includes(lessonType)) {
                res.status(400).json({
                    message: `Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`
                });
                return;
            }
            // Find the hourly rate
            const hourlyRate = await prisma.teacherLessonHourlyRate.findUnique({
                where: {
                    teacherId_type: {
                        teacherId,
                        type: lessonType
                    }
                }
            });
            if (!hourlyRate) {
                res.status(404).json({ message: 'Lesson rate not found' });
                return;
            }
            // Reactivate the hourly rate
            const updatedRate = await prisma.teacherLessonHourlyRate.update({
                where: {
                    id: hourlyRate.id
                },
                data: {
                    deactivatedAt: null
                }
            });
            res.status(200).json({
                id: updatedRate.id,
                type: updatedRate.type,
                rateInCents: updatedRate.rateInCents,
                isActive: true,
                deactivatedAt: null,
                createdAt: updatedRate.createdAt.toISOString(),
                updatedAt: updatedRate.updatedAt.toISOString()
            });
        }
        catch (error) {
            console.error('Error reactivating lesson rate:', error);
            res.status(500).json({
                message: 'An error occurred while reactivating lesson rate',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Get statistics for a teacher
     * @param req Request - must include teacherId from authenticated user
     * @param res Response
     * @param next NextFunction
     */
    getTeacherStats: async (req, res, next) => {
        try {
            // Get the teacher ID from the authenticated user
            const teacherId = req.user?.id;
            if (!teacherId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            // Get today's date at midnight for comparing with lesson dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Get statistics using Prisma transactions
            const stats = await prisma.$transaction(async (tx) => {
                // Get all quotes for this teacher
                const quotes = await tx.lessonQuote.findMany({
                    where: { teacherId },
                    include: {
                        lessonRequest: true,
                        lessons: true
                    }
                });
                // Count active quotes (not expired and no lessons created)
                const activeQuotes = quotes.filter((quote) => new Date(quote.expiresAt) > new Date() && quote.lessons.length === 0).length;
                // Get all lessons for this teacher through quotes
                const allLessons = await tx.lesson.findMany({
                    where: {
                        quote: {
                            teacherId
                        }
                    },
                    include: {
                        quote: {
                            include: {
                                lessonRequest: true
                            }
                        }
                    }
                });
                // Total number of lessons
                const totalLessons = allLessons.length;
                // Count completed lessons (start time + duration is in the past)
                const completedLessons = allLessons.filter((lesson) => {
                    const lessonRequest = lesson.quote.lessonRequest;
                    const lessonEndTime = new Date(lessonRequest.startTime);
                    lessonEndTime.setMinutes(lessonEndTime.getMinutes() + lessonRequest.durationMinutes);
                    return lessonEndTime < new Date();
                }).length;
                // Count upcoming lessons (start time is in the future)
                const upcomingLessons = allLessons.filter((lesson) => {
                    const lessonRequest = lesson.quote.lessonRequest;
                    return new Date(lessonRequest.startTime) > new Date();
                }).length;
                return {
                    totalLessons,
                    completedLessons,
                    upcomingLessons,
                    activeQuotes
                };
            });
            res.status(200).json(stats);
        }
        catch (error) {
            console.error('Error fetching teacher statistics:', error);
            res.status(500).json({
                message: 'An error occurred while fetching teacher statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
