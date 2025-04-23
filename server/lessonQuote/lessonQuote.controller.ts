import { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Remove unused
import { lessonQuoteService } from './lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js'; // Import LessonService
import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js'; // Import LessonRequestService
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js'; // Alias for clarity
import { lessonController } from '../lesson/lesson.controller.js'; // Import lessonController

// const prismaClient = new PrismaClient(); // Remove unused

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * Create quotes for a lesson request
   * Requires STUDENT role.
   * @param req Request with lessonRequestId in the body
   * @param res Response
   */
  createLessonQuotes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonRequestId } = req.body;
      // No lessonType needed here, service should derive it from request

      if (!lessonRequestId) {
        res.status(400).json({ message: 'Missing required field: lessonRequestId.' });
        return;
      }

      // Check if Lesson Request exists using the service
      const lessonRequest = await lessonRequestService.getLessonRequestById(lessonRequestId);

      if (!lessonRequest) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }

      // Pass lesson type to the service
      const quotes = await lessonQuoteService.createQuotesForLessonRequest(
        lessonRequestId,
        lessonRequest.type as SharedLessonType // Use type from fetched request
      );

      // Respond with 200 OK as we are returning existing/newly created quotes
      res.status(200).json(quotes);
    } catch (error) {
      console.error('Error creating lesson quotes:', error);
      res.status(500).json({
        message: 'An error occurred while creating lesson quotes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get quotes for a lesson request
   * Requires authentication.
   * @param req Request with lessonRequestId as a route parameter
   * @param res Response
   */
  getLessonQuotesByRequestId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonRequestId } = req.params;

      if (!lessonRequestId) {
        res.status(400).json({ error: 'Lesson request ID is required' });
        return;
      }

      // Check if Lesson Request exists using the service
      const lessonRequestExists = await lessonRequestService.getLessonRequestById(lessonRequestId);

      if (!lessonRequestExists) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }

      // Use the service to get quotes
      const quotes = await lessonQuoteService.getQuotesByLessonRequest(lessonRequestId);
      res.status(200).json(quotes);
    } catch (error) {
      console.error('Error fetching lesson quotes:', error);
      res.status(500).json({ error: 'Failed to fetch lesson quotes' });
    }
  },

  /**
   * Accept a lesson quote and create a corresponding lesson.
   * Requires STUDENT role.
   * @param req Request with quoteId as a route parameter
   * @param res Response
   */
  acceptQuote: async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.params;
    const userId = req.user?.id;
    // We already check role in middleware, so userType check isn't strictly needed here
    // const userType = req.user?.userType;

    if (!quoteId) {
      res.status(400).json({ error: 'Missing quoteId parameter' });
      return;
    }
    if (!userId) {
      // This case should ideally be caught by authMiddleware, but good practice to check
      res.status(401).json({ error: 'Unauthorized - User ID not found on request' });
      return;
    }

    try {
      // Use the service to fetch the quote for checks
      const quote = await lessonQuoteService.getQuoteForAcceptanceCheck(quoteId);

      if (!quote) {
        res.status(404).json({ error: `Quote with ID ${quoteId} not found.` });
        return;
      }

      // Check ownership
      if (quote.lessonRequest?.studentId !== userId) {
        res.status(403).json({ error: 'Forbidden: You can only accept quotes for your own lesson requests.' });
        return;
      }

      // Check if quote is already associated with a lesson
      if (quote.Lesson) { // Prisma includes relation as model name (Lesson)
        res.status(409).json({ error: 'Conflict: This quote has already been accepted and has an associated lesson.' });
        return;
      }

      // Use LessonService to create the lesson
      const createdLesson = await lessonService.create(quoteId);

      // Transform the result before sending
      const modelLesson = lessonController.transformToModel(createdLesson);

      res.status(200).json(modelLesson);

    } catch (error) {
      console.error('Error accepting quote:', error);
      // Handle potential specific errors from the service if necessary
      res.status(500).json({ error: 'Failed to accept lesson quote' });
    }
  },

  // Removed getLessonQuoteById as it's not used in routes
  // Removed acceptLessonQuote as it was replaced by acceptQuote
}; 