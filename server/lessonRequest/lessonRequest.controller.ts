import type { Request, Response, NextFunction } from 'express';
import { lessonRequestService } from './lessonRequest.service.js';
import { AddressDTO } from '../../shared/models/Address.js';
import { LessonType } from '../../shared/models/LessonType.js'; // Import LessonType enum
import { UserType } from '../../shared/models/UserType.js';
// Import all required errors from the central index file
import { AuthorizationError, BadRequestError, NotFoundError } from '../errors/index.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for lesson request controller
const logger = createChildLogger('lesson-request-controller');

export class LessonRequestController {
  constructor() {
    // Bind methods to ensure 'this' context
    this.createLessonRequest = this.createLessonRequest.bind(this);
    this.getLessonRequestById = this.getLessonRequestById.bind(this);
    this.getLessonRequestsByStudent = this.getLessonRequestsByStudent.bind(this);
  }

  /**
   * Create a new lesson request
   * @route POST /api/lesson-requests
   * @param req - Express request (AuthenticatedRequest)
   * @param res - Express response
   * @param next - Express next function
   */
  async createLessonRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract data and user
      const { type, startTime, durationMinutes, addressObj, studentId } = req.body;
      const authenticatedUser = req.user;

      // --- Authorization Check --- //
      // Allow if:
      // 1. The authenticated user is the student for whom the request is being created.
      // 2. The authenticated user is a TEACHER (creating on behalf of a student for a plan).
      if (!authenticatedUser?.id ||
        (studentId !== authenticatedUser.id && authenticatedUser.userType !== UserType.TEACHER)) {
        return next(new AuthorizationError('Forbidden: You can only create lesson requests for yourself or if you are a teacher creating a planned lesson.'));
      }
      // --- End Authorization Check --- 

      // --- Data Preparation ---
      // Basic check if addressObj exists before accessing properties
      if (!addressObj) {
        // Service will catch specific missing fields, but this prevents runtime errors here
        return next(new BadRequestError('addressObj is required.'));
      }
      // Default country BEFORE passing to service (as service expects complete AddressDTO)
      const country = addressObj.country || 'USA';

      // Convert string date to Date object
      const parsedStartTime = new Date(startTime);
      // Service will validate the date object itself

      // Prepare Address DTO for the service
      const addressDTO: AddressDTO = {
        street: addressObj.street,
        city: addressObj.city,
        state: addressObj.state,
        postalCode: addressObj.postalCode,
        country: country
      };

      // Validate durationMinutes is a number before parseInt
      const parsedDuration = parseInt(durationMinutes, 10);
      if (isNaN(parsedDuration)) {
        // Service checks for positive integer, but catch NaN here
        return next(new BadRequestError('durationMinutes must be a valid number.'));
      }

      // --- Call Service --- 
      // Service now handles validation of types, formats, existence (student), etc.
      const lessonRequest = await lessonRequestService.createLessonRequest({
        type: type as LessonType, // Cast type if necessary, service validates enum
        startTime: parsedStartTime,
        durationMinutes: parsedDuration,
        addressDTO: addressDTO,
        studentId: studentId
      });

      // Service returns model or throws error
      res.status(201).json(lessonRequest);

    } catch (error) {
      next(error); // Pass all errors (Auth, NotFound, BadRequest) to central handler
    }
  }

  /**
   * Get a lesson request by ID
   * @route GET /api/v1/lesson-requests/:id
   * @param req - Express request (typed with AuthenticatedRequest)
   * @param res - Express response
   * @param next - Express next function
   */
  async getLessonRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract params and user
      const { id } = req.params;
      const authenticatedUser = req.user; // Get user from token

      // --- Authentication Check (already done by middleware) --- 
      if (!authenticatedUser) {
        // This case should ideally be handled by authMiddleware, but defensive check is okay
        // Use next for consistent error handling
        return next(new AuthorizationError('Authentication required.'));
      }

      // Call service - validation of ID format happens inside
      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        // Use standard NotFoundError via next
        return next(new NotFoundError(`No lesson request found with ID ${id}`));
      }

      // --- Authorization Check: Ownership for Students --- 
      if (authenticatedUser.userType === UserType.STUDENT && lessonRequest.student.id !== authenticatedUser.id) {
        // If the user is a student, they must own the request
        return next(new AuthorizationError('Forbidden: You do not have permission to view this lesson request.'));
      }
      // --- End Authorization Check --- 

      // Teachers are allowed based on the checkRole middleware in the route
      // Students who pass the ownership check are also allowed

      // Return model directly
      res.json(lessonRequest);
    } catch (error) {
      logger.error('Error fetching lesson request:', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Use next(error) to let the central error handler manage responses
      next(error);
    }
  }

  /**
   * Get all lesson requests for a student
   * @route GET /api/v1/lesson-requests?studentId=...
   * @param req - Express request
   * @param res - Express response
   */
  async getLessonRequestsByStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get studentId from query parameter
      const { studentId } = req.query as { studentId?: string }; // Type assertion for query param
      // Cast req.user to expected structure, using string for userType
      const authenticatedUser = req.user as { id: string; userType: string } | undefined; // Get user info from token

      // --- Validation: Check if studentId is provided ---
      if (!studentId) {
        return next(new BadRequestError('Missing or invalid studentId query parameter'));
      }
      // --- End Validation ---

      if (!authenticatedUser?.id) {
        // Should be caught by middleware, but defensive check
        return next(new AuthorizationError('Authentication required.'));
      }

      // --- Authorization: Ensure student is requesting their own data ---
      // Compare string value from casted userType
      if (authenticatedUser.userType === UserType.STUDENT && authenticatedUser.id !== studentId) {
        return next(new AuthorizationError('Forbidden: You can only view your own lesson requests.'));
      }
      // --- End Authorization ---

      // Call service - validation of studentId format happens inside
      // Service now returns LessonRequest[]
      const lessonRequests = await lessonRequestService.getLessonRequestsByStudent(studentId);

      // Return models directly
      res.json(lessonRequests);
    } catch (error) {
      // Use next(error) for consistent central error handling
      next(error);
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 