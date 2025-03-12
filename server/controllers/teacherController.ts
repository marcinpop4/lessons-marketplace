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
              teacherLessonHourlyRates: true
            },
            take: limitValue
          };
          
          // Add where clause if filtering by lesson type
          if (lessonTypeFilter) {
            query.where = {
              teacherLessonHourlyRates: {
                some: {
                  type: lessonTypeFilter
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
  }
}; 