import { Request, Response, NextFunction } from 'express';
import { lessonQuoteService } from './lessonQuote.service.js';
import { LessonType as SharedLessonType } from '@shared/models/LessonType.js';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { UserType as SharedUserType } from '@shared/models/UserType.js';
import { AuthorizationError, BadRequestError } from '../errors/index.js';
import { lessonRequestService } from '@server/lessonRequest/lessonRequest.service.js';
import { Teacher } from '@shared/models/Teacher.js';
import { teacherService } from '@server/teacher/teacher.service.js';
import { isUuid } from '../utils/validation.utils.js';
/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * POST /
   * Generate and create quotes for a lesson request.
   * Requires STUDENT role.
   * @param req Request with { lessonRequestId, teacherIds } in the body
   * @param res Response
   */
  createLessonQuote: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId, teacherIds } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        throw new AuthorizationError('Student ID not found on authenticated request.');
      }
      if (req.user?.userType !== SharedUserType.STUDENT) {
        throw new AuthorizationError('Only students can initiate quote generation.');
      }

      if (!lessonRequestId || !isUuid(lessonRequestId)) {
        throw new BadRequestError('Valid Lesson Request ID is required.');
      }

      let teachers: Teacher[] | undefined = undefined;

      if (teacherIds !== undefined && teacherIds !== null) {
        if (!Array.isArray(teacherIds)) {
          throw new BadRequestError('teacherIds must be an array if provided.');
        }
        const invalidIds = teacherIds.filter(id => typeof id !== 'string' || !isUuid(id));
        if (invalidIds.length > 0) {
          throw new BadRequestError(`Invalid Teacher UUIDs provided in teacherIds: ${invalidIds.join(', ')}`);
        }
        if (teacherIds.length === 0) {
          throw new BadRequestError('teacherIds cannot be an empty array if provided; omit the field instead.');
        }

        const validatedTeacherIds: string[] = teacherIds;
        teachers = await teacherService.getTeachersByIds(validatedTeacherIds);
      }

      const lessonRequest = await lessonRequestService.getLessonRequestById(lessonRequestId);

      const quotes = await lessonQuoteService.createQuotes(
        lessonRequest,
        teachers
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