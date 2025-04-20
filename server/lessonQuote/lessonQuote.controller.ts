import { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Remove unused
import prisma from '../prisma.js';
import { lessonQuoteService } from './lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js'; // Import LessonService
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js'; // Alias for clarity

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

      // --- Check if Lesson Request exists --- //
      const lessonRequest = await prisma.lessonRequest.findUnique({
        where: { id: lessonRequestId },
        select: { id: true, type: true } // Select only needed fields
      });

      if (!lessonRequest) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }
      // --- End Check --- //

      // Pass lesson type to the service as well, casting Prisma enum to Shared enum
      const quotes = await lessonQuoteService.createQuotesForLessonRequest(
        lessonRequestId,
        lessonRequest.type as SharedLessonType // Cast Prisma type to Shared type
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

      // --- Check if Lesson Request exists --- //
      const lessonRequestExists = await prisma.lessonRequest.findUnique({
        where: { id: lessonRequestId },
        select: { id: true } // Only need to check existence
      });

      if (!lessonRequestExists) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }
      // --- End Check --- //

      // Use the service
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
      // --- Check if Quote exists and belongs to the user's request --- //
      const quote = await prisma.lessonQuote.findUnique({
        where: { id: quoteId },
        include: {
          lessonRequest: { select: { studentId: true } }, // Select only needed field
          Lesson: { select: { id: true } } // Check if a lesson already exists
        }
      });

      if (!quote) {
        res.status(404).json({ error: `Quote with ID ${quoteId} not found.` });
        return;
      }

      if (quote.lessonRequest.studentId !== userId) {
        res.status(403).json({ error: 'Forbidden: You can only accept quotes for your own lesson requests.' });
        return;
      }

      // Check if quote is already associated with a lesson
      if (quote.Lesson) {
        // Use 409 Conflict as it's a state conflict
        res.status(409).json({ error: 'Conflict: This quote has already been accepted and has an associated lesson.' });
        return;
      }

      // --- End Checks --- //

      // Use LessonService to create the lesson (handles transaction internally)
      const createdLesson = await lessonService.create(prisma, quoteId);

      // Return the created lesson (service should handle sanitization)
      res.status(200).json(createdLesson); // Use 200 OK as resource (Lesson) was implicitly created

    } catch (error) {
      console.error('Error accepting quote:', error);
      // Handle potential specific errors from the service if necessary
      res.status(500).json({ error: 'Failed to accept lesson quote' });
    }
  },

  // Removed getLessonQuoteById as it's not used in routes
  // Removed acceptLessonQuote as it was replaced by acceptQuote
}; 