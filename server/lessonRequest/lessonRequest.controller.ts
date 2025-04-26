import type { Request, Response, NextFunction } from 'express';
import { lessonRequestService } from './lessonRequest.service.js';
import { AddressDTO } from '../../shared/models/Address.js';
import { UserType } from '../../shared/models/UserType.js';
import { AuthorizationError } from '../errors/index.js';

// Add user property to Request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userType: UserType;
    // Add other user properties if needed
  };
}

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
   * @param req - Express request
   * @param res - Express response
   */
  async createLessonRequest(req: Request, res: Response): Promise<void> {
    try {
      const { type, startTime, durationMinutes, addressObj, studentId } = req.body;
      const authenticatedUserId = req.user?.id; // Get ID from token (added by authMiddleware)

      // --- Authorization Check --- 
      if (!authenticatedUserId || studentId !== authenticatedUserId) {
        res.status(403).json({ error: 'Forbidden', message: 'You can only create lesson requests for yourself.' });
        return;
      }
      // --- End Authorization Check --- 

      // --- Validation: Basic Fields & addressObj Existence --- 
      if (!type || !startTime || !durationMinutes || !studentId || !addressObj) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Please provide type, startTime, durationMinutes, studentId, and addressObj'
        });
        return;
      }
      // --- End Basic Validation --- 

      // --- Validation: Address Properties --- 
      if (!addressObj.street || !addressObj.city || !addressObj.state || !addressObj.postalCode) {
        res.status(400).json({
          error: 'Missing required address fields',
          message: 'Address object must include street, city, state, and postalCode'
        });
        return;
      }
      // --- End Address Validation --- 

      // --- Default country if missing (AFTER checking addressObj exists) --- 
      if (!addressObj.country) {
        console.log('Country missing in request, defaulting to USA.');
        addressObj.country = "USA"; // Mutate the object safely now
      }
      // --- End Default country --- 

      // Convert string dates to Date objects
      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startTime must be a valid date string'
        });
        return;
      }

      // Create the address DTO object explicitly using the imported type
      const addressDTO: AddressDTO = {
        street: addressObj.street,
        city: addressObj.city,
        state: addressObj.state,
        postalCode: addressObj.postalCode,
        country: addressObj.country // Will be defaulted if was missing
      };

      // Create lesson request - service now returns LessonRequest model
      const lessonRequest = await lessonRequestService.createLessonRequest({
        type: type,
        startTime: parsedStartTime,
        durationMinutes: parseInt(durationMinutes, 10),
        addressDTO: addressDTO,
        studentId: studentId
      });

      // Return the created lesson request model
      res.status(201).json({
        lessonRequest: lessonRequest // Return model directly
      });

    } catch (error) {
      console.error('Error creating lesson request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific errors
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }

  /**
   * Get a lesson request by ID
   * @route GET /api/v1/lesson-requests/:id
   * @param req - Express request (typed with AuthenticatedRequest)
   * @param res - Express response
   * @param next - Express next function
   */
  async getLessonRequestById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const authenticatedUser = req.user; // Get user from token

      if (!id) {
        res.status(400).json({ error: 'Lesson request ID is required' });
        return;
      }

      // --- Authentication Check (already done by middleware) --- 
      if (!authenticatedUser) {
        // This case should ideally be handled by authMiddleware, but defensive check is okay
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
        return;
      }

      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        res.status(404).json({
          error: 'Lesson request not found',
          message: `No lesson request found with ID ${id}`
        });
        return;
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
      console.error('Error fetching lesson request:', error);
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
  async getLessonRequestsByStudent(req: Request, res: Response): Promise<void> {
    try {
      // Get studentId from query parameter
      const { studentId } = req.query;
      const authenticatedUserId = req.user?.id; // Get ID from token

      // Validation: Check if studentId query parameter is provided
      if (!studentId || typeof studentId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid studentId query parameter' });
        return;
      }

      // Authorization Check: Ensure the requested studentId matches the authenticated user
      if (!authenticatedUserId || studentId !== authenticatedUserId) {
        res.status(403).json({ error: 'Forbidden', message: 'You can only view your own lesson requests.' });
        return;
      }

      // Service now returns LessonRequest[]
      const lessonRequests = await lessonRequestService.getLessonRequestsByStudent(studentId);

      // Return models directly
      res.json(lessonRequests);
    } catch (error) {
      console.error('Error fetching student lesson requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 