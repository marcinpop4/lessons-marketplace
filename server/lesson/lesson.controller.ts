import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserType as PrismaUserType } from '@prisma/client';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Address } from '../../shared/models/Address.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { LessonStatusValue, LessonStatus, LessonStatusTransition } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';
import { lessonService } from './lesson.service.js';
import { AuthorizationError, BadRequestError, NotFoundError } from '../errors/index.js';

// Define AuthenticatedRequest interface using Prisma UserType
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userType: PrismaUserType; // Use Prisma generated type
  };
}

/**
 * Controller for lesson-related operations
 */
export const lessonController = {
  /**
   * GET /lessons?teacherId=... OR /lessons?quoteId=...
   * Get lessons filtered by teacherId (Teacher only) or quoteId (Student/Teacher of quote).
   */
  getLessons: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teacherId, quoteId } = req.query;
      const authenticatedUser = req.user;

      // Validation: Ensure exactly one filter is provided
      if ((!teacherId && !quoteId) || (teacherId && quoteId)) {
        throw new BadRequestError('Exactly one of teacherId or quoteId query parameter must be provided.');
      }
      // Validation: Ensure provided params are strings
      if (teacherId && typeof teacherId !== 'string') {
        throw new BadRequestError('teacherId query parameter must be a string.');
      }
      if (quoteId && typeof quoteId !== 'string') {
        throw new BadRequestError('quoteId query parameter must be a string.');
      }

      // Authorization & Service Call
      if (!authenticatedUser?.id || !authenticatedUser?.userType) {
        return next(new AuthorizationError('Authentication required.'));
      }
      const userId = authenticatedUser.id;
      const userType = authenticatedUser.userType;

      let lessons;
      if (teacherId) {
        // Authorization for teacherId filter
        if (userType !== PrismaUserType.TEACHER) {
          throw new AuthorizationError('Forbidden: Only teachers can filter by teacherId.');
        }
        if (userId !== teacherId) {
          throw new AuthorizationError('Forbidden: Teachers can only retrieve their own lessons.');
        }
        // Call service (no requestingUserId needed as authorization done here)
        lessons = await lessonService.findLessons({ teacherId });
      } else if (quoteId) {
        // Authorization for quoteId filter is handled within the service
        lessons = await lessonService.findLessons({ quoteId, requestingUserId: userId });
      } else {
        // Should be caught by initial validation, but belts and braces
        throw new BadRequestError('Missing required query parameter.');
      }

      res.status(200).json(lessons);
    } catch (error) {
      next(error); // Pass errors (BadRequestError, AuthorizationError, etc.) to central handler
    }
  },

  /**
   * Create a new lesson
   * @route POST /api/lessons
   * @param req Request with quoteId in the body
   * @param res Express response
   */
  createLesson: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) {
        throw new BadRequestError('Missing required field: quoteId');
      }
      // Authorization happens implicitly via authMiddleware enforcing login.
      // Service handles quote validation (existence, not already used).
      const lesson = await lessonService.create(quoteId);
      res.status(201).json(lesson);
    } catch (error) {
      next(error); // Pass NotFoundError, ConflictError, etc. to central handler
    }
  },

  /**
   * Get a lesson by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getLessonById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const authenticatedUser = req.user;

      if (!authenticatedUser?.id) {
        return next(new AuthorizationError('Authentication required.'));
      }

      // Service now returns null if not found OR not authorized for this user
      const lesson = await lessonService.getLessonById(id, authenticatedUser.id);

      if (!lesson) {
        // Return 404 whether it doesn't exist or user can't access it
        throw new NotFoundError(`Lesson with ID ${id} not found or access denied.`);
      }
      res.status(200).json(lesson);
    } catch (error) {
      next(error); // Pass error (including NotFoundError) to central handler
    }
  },

  /**
   * Update the status of a specific lesson
   * @route PATCH /api/lessons/:lessonId
   * @param req Request with lessonId in params and { transition, context } in body
   * @param res Express response
   */
  updateLessonStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonId } = req.params;
      const { transition, context } = req.body;
      const authenticatedUserId = req.user?.id; // Added by authMiddleware
      const authenticatedUserType = req.user?.userType; // Added by authMiddleware

      if (!authenticatedUserId || !authenticatedUserType) {
        return next(new AuthorizationError('Authentication required.'));
      }
      // Role check is handled by middleware, but confirm teacher ID matches for safety if needed
      // For simplicity, assuming role check middleware is sufficient here.

      // Validate required fields (transition is validated by service state machine)
      if (!lessonId || !transition) {
        throw new BadRequestError('Missing required fields: lessonId or transition.');
      }

      const updatedLesson = await lessonService.updateStatus(
        lessonId,
        transition as LessonStatusTransition, // Service validates transition enum
        context,
        authenticatedUserId // Pass user ID for potential deeper auth in service
      );

      res.status(200).json(updatedLesson);
    } catch (error) {
      next(error); // Pass error to central handler (NotFound, BadRequest, StateMachineError etc.)
    }
  }
}; 