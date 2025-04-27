import { Request, Response, NextFunction } from 'express';
import { lessonQuoteService } from './lessonQuote.service.js';
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { UserType as SharedUserType } from '@shared/models/UserType.js';
import { AuthorizationError, BadRequestError } from '../errors/index.js';

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * POST /
   * Generate and create quotes for a lesson request.
   * Requires STUDENT role.
   * @param req Request with { lessonRequestId, lessonType } in the body
   * @param res Response
   */
  createLessonQuote: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId, lessonType } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        throw new AuthorizationError('Student ID not found on authenticated request.');
      }
      if (req.user?.userType !== SharedUserType.STUDENT) {
        throw new AuthorizationError('Only students can initiate quote generation.');
      }

      if (!lessonType || !Object.values(SharedLessonType).includes(lessonType as SharedLessonType)) {
        throw new BadRequestError(`Invalid lesson type provided: ${lessonType}`);
      }

      const quotes = await lessonQuoteService.generateAndCreateQuotes(
        lessonRequestId,
        lessonType as SharedLessonType
      );

      res.status(201).json(quotes);
    } catch (error) {
      next(error);
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
      const { lessonRequestId } = req.query as { lessonRequestId?: string };
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId || !userType) {
        throw new AuthorizationError('User details not found on authenticated request.');
      }

      if (!lessonRequestId) {
        throw new BadRequestError('lessonRequestId query parameter is required.');
      }

      const quotes = await lessonQuoteService.getQuotesByLessonRequest(lessonRequestId);

      res.status(200).json(quotes);

    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /:quoteId
   * Update a lesson quote status (e.g., accept, reject).
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

      if (!userId || !userType) {
        throw new AuthorizationError('User details not found on authenticated request.');
      }

      if (!status || !Object.values(LessonQuoteStatusValue).includes(status as LessonQuoteStatusValue)) {
        throw new BadRequestError(`Invalid status value provided: ${status}`);
      }

      const sharedUserType = userType as SharedUserType;

      const updatedQuote = await lessonQuoteService.updateStatus(
        quoteId,
        status as LessonQuoteStatusValue,
        context ?? null,
        userId,
        sharedUserType
      );

      res.status(200).json(updatedQuote);

    } catch (error) {
      next(error);
    }
  },
};