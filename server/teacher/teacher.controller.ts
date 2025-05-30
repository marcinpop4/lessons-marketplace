import { Request, Response, NextFunction } from 'express';
import { LessonType } from '../../shared/models/LessonType.js';
import { teacherService } from './teacher.service.js';
import { Lesson } from '../../shared/models/Lesson.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for teacher controller
const logger = createChildLogger('teacher-controller');

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
        throw new BadRequestError('Lesson type is required');
      }

      // Check if the provided lessonType is valid
      if (!Object.values(LessonType).includes(lessonType as LessonType)) {
        throw new BadRequestError(`Invalid lesson type. Must be one of: ${Object.values(LessonType).join(', ')}`);
      }

      // Parse and validate limit parameter
      if (!limit) {
        throw new BadRequestError('Limit parameter is required');
      }

      if (!/^\d+$/.test(limit as string)) {
        throw new BadRequestError('Limit must be a positive number');
      }

      const limitValue = Number(limit);
      if (limitValue < 1) {
        throw new BadRequestError('Limit must be a positive number');
      }

      // Use the refactored service method (returns Teacher[])
      const teachers = await teacherService.findTeachersByLessonType(lessonType as LessonType, limitValue);

      // Return shared models directly
      res.status(200).json(teachers);
    } catch (error) {
      logger.error('Error in getTeachers:', { error });
      next(error);
    }
  },

  /**
   * Get statistics for the authenticated teacher (e.g., number of students, lessons).
   */
  getTeacherStats: async (req: Request, res: Response): Promise<void> => {
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
      logger.error('Error fetching teacher stats:', error);
      res.status(500).json({ message: 'An error occurred while fetching teacher stats' });
    }
  },

  /**
   * Get a specific teacher by ID (including active rates)
   */
  getTeacherById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Add validation for ID format (UUID)
      if (!UUID_REGEX.test(id)) {
        throw new BadRequestError('Invalid teacher ID format. Must be a valid UUID.');
      }

      // Call the service method
      const teacher = await teacherService.getTeacherById(id);
      res.status(200).json(teacher);
    } catch (error) {
      // Let the central error handler manage NotFoundError, BadRequestError and other errors
      next(error);
    }
  }
}; 