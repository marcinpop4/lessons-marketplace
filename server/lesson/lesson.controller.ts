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
import { AuthorizationError, BadRequestError, NotFoundError, AppError } from '../errors/index.js';
import { UpdateLessonDto } from './lesson.dto.js'; // Import the consolidated DTO

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
      // Extract query params
      const { teacherId, quoteId } = req.query as { teacherId?: string, quoteId?: string };
      const authenticatedUser = req.user;

      // --- Validation (Controller Level - Parameter Exclusivity) ---
      if ((!teacherId && !quoteId) || (teacherId && quoteId)) {
        // This check determines *how* the service is called, so it stays here.
        throw new BadRequestError('Exactly one of teacherId or quoteId query parameter must be provided.');
      }
      // --- End Validation ---

      // Authorization & Service Call
      if (!authenticatedUser?.id || !authenticatedUser?.userType) {
        throw new AuthorizationError('Authentication required.');
      }
      const userId = authenticatedUser.id;
      const userType = authenticatedUser.userType;

      let lessons;
      if (teacherId) {
        // Authorization for teacherId filter
        if (userType !== PrismaUserType.TEACHER) {
          throw new AuthorizationError('Only teachers can filter by teacherId.');
        }
        if (userId !== teacherId) {
          throw new AuthorizationError('Teachers can only retrieve their own lessons.');
        }
        // Call service (no requestingUserId needed as authorization done here)
        lessons = await lessonService.findLessons({ teacherId });
      } else if (quoteId) {
        // Call service - validation of quoteId format and requestingUserId happens in service
        lessons = await lessonService.findLessons({ quoteId, requestingUserId: userId });
      } else {
        // Should be caught by initial validation, but belts and braces
        throw new AppError('Internal controller error: Parameter logic failed.', 500);
      }

      res.status(200).json(lessons);
    } catch (error) {
      next(error); // Pass errors (AuthError/BadRequest from controller, BadRequest/NotFound/Auth from service) to central handler
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
      // Extract quoteId directly from body
      const { quoteId } = req.body;
      // Authorization happens implicitly via authMiddleware enforcing login.
      // Service handles quote validation (presence, format, existence, not already used).
      const lesson = await lessonService.create(quoteId);
      res.status(201).json(lesson);
    } catch (error) {
      next(error); // Pass BadRequestError, NotFoundError, ConflictError, etc. from service
    }
  },

  /**
   * Get a lesson by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getLessonById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract id directly
      const { id } = req.params;
      const authenticatedUser = req.user;

      // Still check authenticated user from middleware
      if (!authenticatedUser?.id) {
        throw new AuthorizationError('Authentication required.');
      }

      // Call service - validation and authorization check happens inside
      const lesson = await lessonService.getLessonById(id, authenticatedUser.id);

      // Service returns null if not found OR user not authorized
      if (!lesson) {
        // Return 404 whether it doesn't exist or user can't access it
        // Use standard error handler for consistency
        // Throwing an error that the central handler can map to 404
        throw new NotFoundError(`Lesson with ID ${id} not found or access denied.`);
      }
      res.status(200).json(lesson);
    } catch (error) {
      next(error); // Pass error (AuthError from controller, BadRequest/AppError from service)
    }
  },

  /**
   * Update lesson details (status, milestoneId, etc.)
   * @route PATCH /api/lessons/:lessonId
   * @param req Request with lessonId in params and UpdateLessonDto in body
   * @param res Express response
   */
  updateLesson: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonId } = req.params;
      const updateDto: UpdateLessonDto = req.body;
      const actor = req.user;

      if (!actor?.id || !actor?.userType) {
        throw new AuthorizationError('Authentication required.');
      }

      // Basic validation: ensure at least one updatable field is present if needed, or rely on service
      // For now, service will handle validation of DTO content (e.g., if both transition and milestoneId are missing)
      // Or if specific combinations are invalid.

      const updatedLesson = await lessonService.updateLessonDetails(
        lessonId,
        updateDto,
        actor
      );

      res.status(200).json(updatedLesson);
    } catch (error) {
      next(error);
    }
  }
}; 