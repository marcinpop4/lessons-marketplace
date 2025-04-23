import { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Address } from '../../shared/models/Address.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { LessonStatusValue, LessonStatus, LessonStatusTransition } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';
import { lessonService } from './lesson.service.js';

/**
 * Controller for lesson-related operations
 */
export const lessonController = {
  /**
   * Create a new lesson
   * @route POST /api/lessons
   * @param req Request with quoteId in the body
   * @param res Express response
   */
  createLesson: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.body;

      // Validate required fields
      if (!quoteId) {
        res.status(400).json({ error: 'Missing required field: quoteId' });
        return;
      }

      // Create lesson using the service (returns Lesson model)
      const lesson = await lessonService.create(quoteId);

      // Remove transformation
      // const modelLesson = lessonController.transformToModel(lesson);

      // Return the created lesson model directly
      res.status(201).json(lesson);
    } catch (error) {
      console.error('Error creating lesson:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific errors like quote not found or already used
      if (errorMessage.includes('not found') || errorMessage.includes('already linked')) {
        res.status(404).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  },

  /**
   * Get a lesson by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getLessonById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Use the service method (returns Lesson | null)
      const lesson = await lessonService.getLessonById(id);

      if (!lesson) {
        res.status(404).json({
          message: `Lesson with ID ${id} not found.`
        });
        return;
      }

      // Remove transformation
      // const modelLesson = lessonController.transformToModel(lesson);

      // Return the lesson model directly
      res.status(200).json(lesson);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the lesson',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get lessons by quote ID
   * @param req Request with quoteId as a route parameter
   * @param res Response
   */
  getLessonsByQuoteId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;

      // Use the service method (returns Lesson[])
      const lessons = await lessonService.getLessonsByQuoteId(quoteId);

      // Remove transformation
      // const modelLessons = lessons.map(lesson => lessonController.transformToModel(lesson));

      // Return the lesson models directly
      res.status(200).json(lessons);
    } catch (error) {
      console.error('Error fetching lessons by quote:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the lessons',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update the status of a specific lesson
   * @route PATCH /api/lessons/:lessonId
   * @param req Request with lessonId in params and { transition, context } in body
   * @param res Express response
   */
  updateLessonStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      // Extract transition and context instead of newStatus
      const { transition, context } = req.body;
      const authenticatedTeacherId = req.user?.id; // Get ID from token (added by authMiddleware)

      // Validate input
      if (!lessonId) {
        res.status(400).json({ error: 'Bad Request', message: 'Lesson ID is required.' });
        return;
      }
      // Validate transition using the enum
      if (!transition || !Object.values(LessonStatusTransition).includes(transition as LessonStatusTransition)) {
        res.status(400).json({ error: 'Bad Request', message: `Invalid or missing transition: ${transition}` });
        return;
      }

      // Call the service to update the status using transition (returns Lesson | null)
      const updatedLesson = await lessonService.updateStatus(
        lessonId,
        transition as LessonStatusTransition,
        context,
        authenticatedTeacherId
      );

      // Add check for null return from service (e.g., if error handled by returning null)
      if (!updatedLesson) {
        // If service returns null, it implies an error handled within the service
        // The specific error should have been logged by the service
        // Return a generic 500, or adjust based on how service errors are handled
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update lesson status.' });
        return;
      }

      // Remove transformation
      // const modelLesson = lessonController.transformToModel(updatedLesson);

      // Return the updated lesson model directly
      res.status(200).json(updatedLesson);
    } catch (error) {
      console.error('Error updating lesson status:', error);
      // Handle specific errors (like lesson not found, invalid transition, unauthorized)
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: 'Not Found', message: error.message });
        } else if (error.message.includes('Invalid status transition')) {
          res.status(400).json({ error: 'Bad Request', message: error.message });
        } else if (error.message.includes('Unauthorized')) {
          res.status(403).json({ error: 'Forbidden', message: error.message });
        } else {
          res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'An unknown error occurred' });
      }
    }
  }
}; 