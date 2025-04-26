import { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Remove unused
import { lessonQuoteService } from './lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js'; // Import LessonService
import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js'; // Import LessonRequestService
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js'; // Alias for clarity
import { lessonController } from '../lesson/lesson.controller.js'; // Import lessonController
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { UserType } from '@shared/models/UserType.js'; // Import UserType enum

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
  createLessonQuote: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonRequestId, costInCents, hourlyRateInCents } = req.body;
      const teacherId = req.user?.id; // Get teacher ID from authenticated user

      if (!lessonRequestId || !costInCents || !hourlyRateInCents) {
        res.status(400).json({ message: 'Missing required fields: lessonRequestId, costInCents, hourlyRateInCents.' });
        return;
      }
      if (!teacherId) {
        res.status(401).json({ error: 'Unauthorized - Teacher ID not found on request' });
        return;
      }

      // Check if Lesson Request exists
      const lessonRequest = await lessonRequestService.getLessonRequestById(lessonRequestId);
      if (!lessonRequest) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }

      // TODO: Consider adding check: Prevent teacher from quoting their own request if applicable
      // TODO: Consider adding check: Prevent multiple quotes by same teacher for same request?

      // Call the service to create a *single* quote
      const quote = await lessonQuoteService.create({
        lessonRequestId,
        teacherId,
        costInCents,
        hourlyRateInCents,
      });

      if (!quote) {
        // Handle potential null return from service if creation failed gracefully
        res.status(500).json({ message: 'Failed to create lesson quote in service.' });
        return;
      }

      res.status(201).json(quote); // Return the single created quote with 201 Created
    } catch (error) {
      console.error('Error creating lesson quote:', error);
      // Handle potential Prisma constraint errors (e.g., unique quote per teacher/request)
      if (error instanceof Error && (error as any).code === 'P2002') {
        res.status(409).json({ message: 'Conflict: A quote from this teacher for this request may already exist.' });
      } else {
        res.status(500).json({
          message: 'An error occurred while creating the lesson quote',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  },

  /**
   * GET /
   * Get quotes, filtered by query parameters (lessonRequestId is required).
   * Requires STUDENT or TEACHER role.
   * @param req Request with lessonRequestId as a query parameter
   * @param res Response
   */
  getLessonQuotes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonRequestId } = req.query;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!lessonRequestId || typeof lessonRequestId !== 'string') {
        res.status(400).json({ error: 'lessonRequestId query parameter is required' });
        return;
      }
      if (!userId || !userType) {
        res.status(401).json({ error: 'Unauthorized - User details not found on request' });
        return;
      }

      // Check if the lesson request exists *and* if the user is authorized to view its quotes
      const lessonRequest = await lessonRequestService.getLessonRequestById(lessonRequestId);
      if (!lessonRequest) {
        res.status(404).json({ message: `Lesson request with ID ${lessonRequestId} not found.` });
        return;
      }

      // Authorization check: Student must own the request, Teacher can view any request (for now)
      // TODO: Refine Teacher authorization - should they only see quotes they created for this request?
      if (userType === UserType.STUDENT && lessonRequest.student?.id !== userId) {
        res.status(403).json({ error: 'Forbidden: You can only view quotes for your own lesson requests.' });
        return;
      }

      // Fetch quotes using the service
      // TODO: Service might need userId/userType for filtering in the future
      const quotes = await lessonQuoteService.getQuotesByLessonRequest(lessonRequestId);
      res.status(200).json(quotes);

    } catch (error) {
      console.error('Error fetching lesson quotes:', error);
      res.status(500).json({ error: 'Failed to fetch lesson quotes' });
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
  updateLessonQuoteStatus: async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.params;
    const { status, context } = req.body;
    const userId = req.user?.id;
    const userType = req.user?.userType;

    // Basic validation
    if (!quoteId) {
      res.status(400).json({ error: 'Missing quoteId parameter' });
      return;
    }
    if (!status || !Object.values(LessonQuoteStatusValue).includes(status)) {
      res.status(400).json({ error: `Invalid or missing status in request body. Must be one of: ${Object.values(LessonQuoteStatusValue).join(', ')}` });
      return;
    }
    if (!userId || !userType) {
      res.status(401).json({ error: 'Unauthorized - User details not found on request' });
      return;
    }

    try {
      // Fetch the quote and related data for authorization and logic
      // TODO: Service method might need more includes (e.g., teacherId on quote)
      const quoteForCheck = await lessonQuoteService.getQuoteForAcceptanceCheck(quoteId);

      if (!quoteForCheck) {
        res.status(404).json({ error: `Quote with ID ${quoteId} not found.` });
        return;
      }

      // Authorization: Student must own the request, Teacher must own the quote
      const isStudentOwner = userType === UserType.STUDENT && quoteForCheck.lessonRequest?.studentId === userId;
      // Assuming quoteForCheck will eventually include teacherId via service update
      const isTeacherOwner = userType === UserType.TEACHER && (quoteForCheck as any).teacherId === userId;

      if (!isStudentOwner && !isTeacherOwner) {
        res.status(403).json({ error: 'Forbidden: You are not authorized to update this quote.' });
        return;
      }

      // Role-specific action validation (rough examples)
      if (isStudentOwner && status === LessonQuoteStatusValue.CREATED) {
        // Students can't revert to CREATED
        res.status(400).json({ error: 'Invalid action: Student cannot set status to CREATED.' });
        return;
      }
      if (isTeacherOwner && (status === LessonQuoteStatusValue.ACCEPTED)) {
        // Teachers can't accept/reject quotes
        res.status(400).json({ error: 'Invalid action: Teacher cannot set status to ACCEPTED.' });
        return;
      }

      // Conflict check for accepting an already accepted quote
      if (status === LessonQuoteStatusValue.ACCEPTED && quoteForCheck.Lesson) {
        res.status(409).json({ error: 'Conflict: This quote has already been accepted.' });
        return;
      }

      // --- Perform Action based on Status --- 

      if (status === LessonQuoteStatusValue.ACCEPTED && isStudentOwner) {
        // Student accepts: Create the lesson
        const createdLesson = await lessonService.create(quoteId);
        // TODO: Also update the LessonQuote status via lessonQuoteService
        res.status(200).json(createdLesson); // Return the created lesson

      }

    } catch (error) {
      console.error(`Error updating status for quote ${quoteId}:`, error);
      res.status(500).json({ error: 'Failed to update lesson quote status' });
    }
  },

  // Removed getLessonQuoteById as it's not used in routes
  // Removed acceptLessonQuote as it was replaced by acceptQuote
}; 