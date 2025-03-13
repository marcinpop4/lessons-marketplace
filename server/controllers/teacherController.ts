import { Request, Response } from 'express';
import prisma from '../prisma.js';

// Define LessonType enum to match Prisma schema
enum LessonType {
  VOICE = 'VOICE',
  GUITAR = 'GUITAR',
  BASS = 'BASS',
  DRUMS = 'DRUMS'
}

// Define interfaces to match Prisma models
interface TeacherLessonHourlyRate {
  id: string;
  type: LessonType;
  rateInCents: number;
  teacherId: string;
  deactivatedAt?: Date | null;
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

/**
 * Controller for teacher-related operations
 */
export const teacherController = {
  /**
   * Get teachers filtered by lesson type and limit
   * @param req Request - can include lessonType and limit query parameters
   * @param res Response
   */
  getTeachers: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonType, limit } = req.query;
      
      // Validate lessonType if provided
      let lessonTypeFilter: LessonType | undefined;
      if (lessonType) {
        // Check if the provided lessonType is valid
        if (Object.values(LessonType).includes(lessonType as LessonType)) {
          lessonTypeFilter = lessonType as LessonType;
        } else {
          res.status(400).json({ 
            message: `Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}` 
          });
          return;
        }
      }
      
      // Parse limit parameter, default to 5 if not provided
      const limitValue = limit ? parseInt(limit as string, 10) : 5;
      
      // Check if limit is a valid number
      if (isNaN(limitValue) || limitValue < 1) {
        res.status(400).json({ message: 'Limit must be a positive number' });
        return;
      }
      
      try {
        // Execute the query
        const teachers = await prisma.$transaction(async (tx) => {
          const query: any = {
            include: {
              teacherLessonHourlyRates: {
                where: {
                  deactivatedAt: null
                }
              }
            },
            take: limitValue
          };
          
          // Add where clause if filtering by lesson type
          if (lessonTypeFilter) {
            query.where = {
              teacherLessonHourlyRates: {
                some: {
                  type: lessonTypeFilter,
                  deactivatedAt: null
                }
              }
            };
          }
          
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
   */
  getTeacherProfile: async (req: Request, res: Response): Promise<void> => {
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
        lessonRates: teacher.teacherLessonHourlyRates.map(rate => ({
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
   */
  createOrUpdateLessonRate: async (req: Request, res: Response): Promise<void> => {
    try {
      // Get the teacher ID from the authenticated user
      const teacherId = req.user?.id;
      
      if (!teacherId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { lessonType, rateInCents } = req.body;

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

      // Create or update the hourly rate
      const hourlyRate = await prisma.teacherLessonHourlyRate.upsert({
        where: {
          teacherId_type: {
            teacherId,
            type: lessonType as LessonType
          }
        },
        update: {
          rateInCents,
          deactivatedAt: null // Ensure it's active when updated
        },
        create: {
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
   */
  deactivateLessonRate: async (req: Request, res: Response): Promise<void> => {
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
   */
  reactivateLessonRate: async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      console.error('Error reactivating lesson rate:', error);
      res.status(500).json({
        message: 'An error occurred while reactivating lesson rate',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 