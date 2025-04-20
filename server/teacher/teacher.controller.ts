import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { Prisma, PrismaClient } from '@prisma/client';
import { LessonType } from '../../shared/models/LessonType.js';
import { TeacherService } from './teacher.service.js';

// Define interfaces to match Prisma models
interface TeacherLessonHourlyRate {
  id: string;
  type: LessonType;
  rateInCents: number;
  teacherId: string;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  teacherLessonHourlyRates: TeacherLessonHourlyRate[];
}

// Placeholder service implementation
const teacherService = new TeacherService();

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
  getTeachers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonType, limit } = req.query;

      // Validate lessonType is provided and valid
      if (!lessonType) {
        res.status(400).json({ message: 'Lesson type is required' });
        return;
      }

      // Check if the provided lessonType is valid
      if (!Object.values(LessonType).includes(lessonType as LessonType)) {
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

      if (!/^\d+$/.test(limit as string)) {
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
        const teachers = await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
          const query: any = {
            where: {
              teacherLessonHourlyRates: {
                some: {
                  type: lessonType as LessonType,
                  deactivatedAt: null
                }
              }
            },
            include: {
              teacherLessonHourlyRates: {
                where: {
                  type: lessonType as LessonType,
                  deactivatedAt: null
                }
              }
            },
            take: limitValue
          };

          return await tx.teacher.findMany(query);
        });

        // Transform the data to match the expected frontend format
        const transformedTeachers = teachers.map((teacher: any) => {
          // Create a map of lesson types to rates
          const lessonHourlyRates: Record<string, number> = {};

          // Populate the rates map
          teacher.teacherLessonHourlyRates.forEach((rate: any) => {
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
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({
          message: 'Database error occurred while fetching teachers',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        });
      }
    } catch (error) {
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
  getTeacherProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        lessonRates: teacher.teacherLessonHourlyRates.map((rate: {
          id: string;
          type: string;
          rateInCents: number;
          deactivatedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: rate.id,
          type: rate.type,
          rateInCents: rate.rateInCents,
          isActive: (rate as any).deactivatedAt === null,
          deactivatedAt: (rate as any).deactivatedAt ? (rate as any).deactivatedAt.toISOString() : null,
          createdAt: rate.createdAt.toISOString(),
          updatedAt: rate.updatedAt.toISOString()
        }))
      };

      res.status(200).json(transformedTeacher);
    } catch (error) {
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
  createOrUpdateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
          } as any
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
            type: lessonType as LessonType
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
          type: lessonType as LessonType,
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
    } catch (error) {
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
  deactivateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
            type: lessonType as LessonType
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
        } as any
      });

      res.status(200).json({
        id: updatedRate.id,
        type: updatedRate.type,
        rateInCents: updatedRate.rateInCents,
        isActive: false,
        deactivatedAt: (updatedRate as any).deactivatedAt?.toISOString(),
        createdAt: updatedRate.createdAt.toISOString(),
        updatedAt: updatedRate.updatedAt.toISOString()
      });
    } catch (error) {
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
  reactivateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
            type: lessonType as LessonType
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
        } as any
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
    } catch (error) {
      console.error('Error reactivating lesson rate:', error);
      res.status(500).json({
        message: 'An error occurred while reactivating lesson rate',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get all lessons for a specific teacher
   * Ensures the authenticated user matches the requested teacherId.
   * @param req Request with teacherId as a route parameter
   * @param res Response
   */
  getTeacherLessons: async (req: Request, res: Response): Promise<void> => {
    const { teacherId } = req.params;
    const authenticatedUserId = req.user?.id;
    const authenticatedUserType = req.user?.userType;

    // Authorization: Check if the authenticated user is the teacher they are requesting lessons for
    if (!authenticatedUserId || authenticatedUserId !== teacherId || authenticatedUserType !== 'TEACHER') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only view your own lessons.' });
      return;
    }

    try {
      const lessons = await teacherService.findLessonsByTeacherId(teacherId);

      // Respond with the lessons (service should handle sanitization if needed)
      res.status(200).json(lessons);
    } catch (error) {
      console.error(`[CONTROLLER] Error fetching lessons for teacher ${teacherId}:`, error);
      res.status(500).json({ error: 'Failed to fetch teacher lessons' });
    }
  },

  /**
   * Get statistics for a teacher
   * @param req Request - must include teacherId from authenticated user
   * @param res Response
   * @param next NextFunction
   */
  getTeacherStats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = (req as any).user?.id; // Get ID from authenticated user

      if (!teacherId) {
        res.status(401).json({ error: 'Unauthorized: Teacher ID not found in token.' });
        return;
      }

      const stats = await teacherService.getTeacherStatistics(teacherId);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
}; 