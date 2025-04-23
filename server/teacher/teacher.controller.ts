import { Request, Response, NextFunction } from 'express';
import { Prisma, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';
import { LessonType } from '../../shared/models/LessonType.js';
import { teacherService } from './teacher.service.js';
import { goalService } from '../goal/goal.service.js';
import { Lesson } from '../../shared/models/Lesson.js';

// Note: Interfaces for DB models are removed as we rely on Prisma types or shared models.

/**
 * Controller for teacher-related operations
 */
export const teacherController = {
  /**
   * Get teachers filtered by lesson type and limit
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
        // Use the refactored service method (returns Teacher[])
        const teachers = await teacherService.findTeachersByLessonType(lessonType as LessonType, limitValue);

        // Return shared models directly
        res.status(200).json(teachers);
      } catch (dbError) {
        console.error('Database error fetching teachers:', dbError);
        res.status(500).json({ message: 'Database error fetching teachers' });
      }
    } catch (error) {
      console.error('Error in getTeachers:', error);
      res.status(500).json({ message: 'An error occurred while fetching teachers' });
    }
  },

  /**
   * Get a teacher's profile including all lesson rates (active and inactive)
   */
  getTeacherProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Use the refactored service method (returns Teacher | null)
      const teacher = await teacherService.findTeacherWithRatesById(teacherId);

      if (!teacher) {
        res.status(404).json({ message: 'Teacher not found' });
        return;
      }

      // Return shared model directly
      res.status(200).json(teacher);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      res.status(500).json({ message: 'An error occurred while fetching teacher profile' });
    }
  },

  /**
   * Create or update a lesson hourly rate for a teacher
   */
  createOrUpdateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      // Use the refactored service method (returns TeacherLessonHourlyRate)
      const updatedRate = await teacherService.upsertLessonRate(teacherId, { lessonType, rateInCents, id });

      // Return shared model directly
      res.status(200).json(updatedRate);

    } catch (error) {
      console.error('Error creating/updating lesson rate:', error);
      if (error instanceof Error) {
        if (error.message.includes('Teacher not found') || error.message.includes('Lesson rate not found')) {
          res.status(404).json({ message: error.message });
        } else if (error.message.includes('already has a rate')) {
          res.status(409).json({ message: error.message });
        } else {
          res.status(500).json({ message: 'An error occurred' });
        }
      } else {
        res.status(500).json({ message: 'An unknown error occurred' });
      }
    }
  },

  /**
   * Deactivate a lesson hourly rate for a teacher
   */
  deactivateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      const { lessonRateId: rateId } = req.body;

      if (!teacherId || !rateId) {
        res.status(400).json({ message: 'Unauthorized or missing rate ID' });
        return;
      }

      // Use the refactored service method (returns TeacherLessonHourlyRate)
      const updatedRate = await teacherService.deactivateLessonRate(teacherId, rateId);

      // Return shared model directly
      res.status(200).json(updatedRate);
    } catch (error) {
      console.error('Error deactivating lesson rate:', error);
      if (error instanceof Error && error.message.includes('Lesson rate not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An error occurred while deactivating lesson rate' });
      }
    }
  },

  /**
   * Reactivate a previously deactivated lesson hourly rate
   */
  reactivateLessonRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      const { lessonRateId: rateId } = req.body;

      if (!teacherId || !rateId) {
        res.status(400).json({ message: 'Unauthorized or missing rate ID' });
        return;
      }

      // Use the refactored service method (returns TeacherLessonHourlyRate)
      const updatedRate = await teacherService.reactivateLessonRate(teacherId, rateId);

      // Return shared model directly
      res.status(200).json(updatedRate);
    } catch (error) {
      console.error('Error reactivating lesson rate:', error);
      if (error instanceof Error && error.message.includes('Lesson rate not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An error occurred while reactivating lesson rate' });
      }
    }
  },

  /**
   * Get all lessons for a specific teacher.
   * Optionally filter by student ID.
   * Returns lessons based on shared models, augmented with goal counts.
   */
  getTeacherLessons: async (req: Request, res: Response): Promise<void> => {
    try {
      const requestedTeacherId = req.params.teacherId;
      const studentId = req.query.studentId as string | undefined;
      const authenticatedUserId = req.user?.id;

      if (!authenticatedUserId || authenticatedUserId !== requestedTeacherId) {
        res.status(403).json({ error: 'Forbidden: Can only access your own lessons' });
        return;
      }

      // Use the updated service method which returns shared Lesson models
      const lessons: Lesson[] = await teacherService.findLessonsByTeacherId(authenticatedUserId, studentId);

      // Perform goal count within the controller using goalService
      // Map over the shared Lesson models returned by the service
      const lessonsWithGoalCount = await Promise.all(lessons.map(async (lesson) => {
        // Use goalService to get the count for the lesson ID
        const goalCount = await goalService.getGoalCountByLessonId(lesson.id);

        // Construct the response object.
        // Since the service returns shared models (which exclude passwords),
        // we can spread the lesson object and add the goalCount.
        // We might need to manually serialize Dates to ISO strings if not done automatically by res.json
        // and ensure the shared models are suitable for direct JSON serialization.
        // A safer approach is to explicitly map properties.
        return {
          id: lesson.id,
          type: lesson.type,
          startTime: lesson.startTime.toISOString(),
          durationMinutes: lesson.durationMinutes,
          costInCents: lesson.costInCents,
          currentStatus: lesson.currentStatus.status, // Send only the status value
          currentStatusId: lesson.currentStatusId, // Add currentStatusId
          createdAt: lesson.createdAt?.toISOString(),
          updatedAt: lesson.updatedAt?.toISOString(),
          goalCount, // Add the fetched goal count
          // Include relevant details from nested shared models (teacher, student, address)
          // These are already sanitized (no passwords) by the service transformation
          teacher: {
            id: lesson.teacher.id,
            firstName: lesson.teacher.firstName,
            lastName: lesson.teacher.lastName,
            email: lesson.teacher.email, // Consider if email should be exposed here
            // Exclude phoneNumber, dateOfBirth? Define API contract clearly.
          },
          student: {
            id: lesson.student.id,
            firstName: lesson.student.firstName,
            lastName: lesson.student.lastName,
            // Exclude email, phoneNumber, dateOfBirth? Define API contract clearly.
          },
          address: {
            street: lesson.address.street,
            city: lesson.address.city,
            postalCode: lesson.address.postalCode,
            country: lesson.address.country,
          }
          // Explicitly DO NOT include lesson.quote or deeply nested objects unless needed
        };
      }));

      // Send the transformed array as JSON
      res.status(200).json(lessonsWithGoalCount);
    } catch (error) {
      console.error('Error fetching teacher lessons:', error);
      res.status(500).json({
        error: 'Failed to fetch lessons',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get statistics for a teacher
   */
  getTeacherStats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id; // Get ID from authenticated user
      if (!teacherId) {
        res.status(401).json({ error: 'Unauthorized: Teacher ID not found in token.' });
        return;
      }
      // This already uses the service correctly
      const stats = await teacherService.getTeacherStatistics(teacherId);
      res.status(200).json(stats);
    } catch (error) {
      next(error); // Use next for error handling middleware
    }
  }
}; 