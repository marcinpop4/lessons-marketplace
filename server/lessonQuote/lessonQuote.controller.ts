import { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Remove unused
import { lessonQuoteService } from './lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js'; // Import LessonService
// lessonRequestService no longer needed here
// import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js';
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js'; // Alias for clarity
// lessonController no longer needed here
// import { lessonController } from '../lesson/lesson.controller.js';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { UserType } from '@shared/models/UserType.js'; // Import UserType enum
// Import error classes used by controller logic (only Auth remaining)
import { AuthorizationError } from '../errors/index.js';

// const prismaClient = new PrismaClient(); // Remove unused

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * POST /
   * Create a single quote for a lesson request.
   * Requires TEACHER role.
   * @param req Request with { lessonRequestId, costInCents, hourlyRateInCents } in the body
   * @param res Response
   */
  createLessonQuote: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract data and user ID
      const { lessonRequestId, costInCents, hourlyRateInCents } = req.body;
      const teacherId = req.user?.id; // Get teacher ID from authenticated user

      // Basic check for teacher ID from middleware
      if (!teacherId) {
        throw new AuthorizationError('Teacher ID not found on authenticated request.');
      }

      // Call service - validation (IDs, numbers, request existence) happens inside
      const quote = await lessonQuoteService.create({
        lessonRequestId,
        teacherId,
        costInCents,
        hourlyRateInCents,
      });

      // Service throws NotFoundError or ConflictError if necessary
      res.status(201).json(quote);
    } catch (error) {
      next(error); // Pass errors (Auth, NotFound, Conflict, BadRequest) to central handler
    }
  },

  /**
   * GET /
   * Get quotes, filtered by query parameters (lessonRequestId is required).
   * Requires STUDENT or TEACHER role.
   * @param req Request with lessonRequestId as a query parameter
   * @param res Response
   */
  getLessonQuotes: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract query and user info
      const { lessonRequestId } = req.query as { lessonRequestId?: string };
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Basic check for user details from middleware
      if (!userId || !userType) {
        throw new AuthorizationError('User details not found on authenticated request.');
      }

      // Call service - validation (ID presence/format) happens inside
      // Service *could* also handle authorization, but keeping it here is also valid
      // If kept here, need to fetch request first.
      // Let's assume service handles auth for now for consistency.
      const quotes = await lessonQuoteService.getQuotesByLessonRequest(lessonRequestId!); // Pass potentially validated ID
      // Service will throw NotFoundError or AuthorizationError if needed

      res.status(200).json(quotes);

    } catch (error) {
      next(error); // Pass errors (Auth, NotFound, BadRequest) to central handler
    }
  },

  /**
   * PATCH /:quoteId
   * Update a lesson quote status (e.g., accept, reject, withdraw).
   * Requires STUDENT or TEACHER role.
   * Expects body: { status: LessonQuoteStatusValue, context?: any }
   * @param req Request with quoteId as route param and status/context in body
   * @param res Response
   */
  updateLessonQuoteStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { quoteId } = req.params;
      const { status, context } = req.body;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Basic check for user details
      if (!userId || !userType) {
        throw new AuthorizationError('User details not found on authenticated request.');
      }

      // Call the new service method which handles all validation, auth, and logic
      const updatedQuote = await lessonQuoteService.updateStatus(
        quoteId,
        status,
        context ?? null,
        userId,
        userType
      );

      // If updateStatus results in lesson creation, the ACCEPTED quote is returned.
      // The client might need separate logic if it expects the *lesson* object upon acceptance.
      // For now, return the updated quote.
      res.status(200).json(updatedQuote);

    } catch (error) {
      next(error); // Pass all errors (BadRequest, NotFound, Auth, Conflict, AppError) from service
    }
  },

  // Removed getLessonQuoteById as it's not used in routes
  // Removed acceptLessonQuote as it was replaced by acceptQuote
}; 