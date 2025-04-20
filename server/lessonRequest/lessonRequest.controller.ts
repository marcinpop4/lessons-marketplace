import type { Request, Response } from 'express';
import { lessonRequestService } from './lessonRequest.service.js';
import type { LessonRequest as PrismaLessonRequest } from '@prisma/client';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Address } from '../../shared/models/Address.js';
import { Student } from '../../shared/models/Student.js';
import { lessonQuoteService } from '../lessonQuote/lessonQuote.service.js';

export class LessonRequestController {
  constructor() {
    // Bind methods to ensure 'this' context
    this.createLessonRequest = this.createLessonRequest.bind(this);
    this.getLessonRequestById = this.getLessonRequestById.bind(this);
    this.getLessonRequestsByStudent = this.getLessonRequestsByStudent.bind(this);
  }

  /**
   * Transform a Prisma LessonRequest into our shared model LessonRequest
   */
  private transformToModel(prismaRequest: any): LessonRequest {
    const address = new Address({
      id: prismaRequest.address.id,
      street: prismaRequest.address.street,
      city: prismaRequest.address.city,
      state: prismaRequest.address.state,
      postalCode: prismaRequest.address.postalCode,
      country: prismaRequest.address.country
    });

    // Create Student model instance, excluding password
    const student = new Student({
      id: prismaRequest.student.id,
      firstName: prismaRequest.student.firstName,
      lastName: prismaRequest.student.lastName,
      email: prismaRequest.student.email,
      phoneNumber: prismaRequest.student.phoneNumber,
      dateOfBirth: new Date(prismaRequest.student.dateOfBirth),
      // Explicitly exclude password
    });

    return new LessonRequest({
      id: prismaRequest.id,
      type: prismaRequest.type,
      startTime: new Date(prismaRequest.startTime),
      durationMinutes: prismaRequest.durationMinutes,
      address,
      student // Use the sanitized Student model instance
    });
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
      const addressModel = new Address({
        street: addressObj.street,
        city: addressObj.city,
        state: addressObj.state,
        postalCode: addressObj.postalCode,
        country: addressObj.country // Will be defaulted if was missing
      });

      // Create lesson request
      const lessonRequest = await lessonRequestService.createLessonRequest({
        type: type,
        startTime: parsedStartTime, // Use parsed date
        durationMinutes: parseInt(durationMinutes, 10),
        addressObj: addressModel, // Pass the model instance
        studentId: studentId
      });

      // Transform to shared model
      const modelLessonRequest = this.transformToModel(lessonRequest);

      // --- Restore automatic quote creation ---
      const quotes = await lessonQuoteService.createQuotesForLessonRequest(
        lessonRequest.id,
        type
      );

      // Return the created lesson request and the generated quotes
      res.status(201).json({
        lessonRequest: modelLessonRequest,
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

      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        res.status(404).json({
          error: 'Lesson request not found',
          message: `No lesson request found with ID ${id}`
        });
        return;
      }

      const modelLessonRequest = this.transformToModel(lessonRequest);
      res.json(modelLessonRequest);
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

      const lessonRequests = await lessonRequestService.getLessonRequestsByStudent(studentId);
      const modelLessonRequests = lessonRequests.map(request => this.transformToModel(request));
      res.json(modelLessonRequests);
    } catch (error) {
      console.error('Error fetching student lesson requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 