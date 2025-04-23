import type { Request, Response } from 'express';
import { lessonRequestService } from './lessonRequest.service.js';
import { lessonQuoteService } from '../lessonQuote/lessonQuote.service.js';
import { Address } from '../../shared/models/Address.js';

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

      // Use the addressObj directly from the body
      const addressDTO = {
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
        addressObj: addressDTO, // Pass the DTO object
        studentId: studentId
      });

      // Automatic quote creation
      const quotes = await lessonQuoteService.createQuotesForLessonRequest(
        lessonRequest.id,
        type
      );

      // Return the created lesson request model and the generated quotes
      res.status(201).json({
        lessonRequest: lessonRequest, // Return model directly
        quotes
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
   * @route GET /api/lesson-requests/:id
   * @param req - Express request
   * @param res - Express response
   */
  async getLessonRequestById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Lesson request ID is required' });
        return;
      }

      // Service now returns LessonRequest | null
      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        res.status(404).json({
          error: 'Lesson request not found',
          message: `No lesson request found with ID ${id}`
        });
        return;
      }

      // Return model directly
      res.json(lessonRequest);
    } catch (error) {
      console.error('Error fetching lesson request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }

  /**
   * Get all lesson requests for a student
   * @route GET /api/lesson-requests/student/:studentId
   * @param req - Express request
   * @param res - Express response
   */
  async getLessonRequestsByStudent(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
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