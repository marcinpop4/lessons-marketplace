import type { Request, Response } from 'express';
import { lessonRequestService } from '../services/database/lessonRequestService.js';
import type { LessonRequest as PrismaLessonRequest } from '@prisma/client';
import { LessonRequest } from '@shared/models/LessonRequest.js';
import { Address } from '@shared/models/Address.js';
import { teacherQuoteService } from '../services/teacherQuoteService.js';

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
    const address = new Address(
      prismaRequest.address.street,
      prismaRequest.address.city,
      prismaRequest.address.state,
      prismaRequest.address.postalCode,
      prismaRequest.address.country
    );

    return new LessonRequest(
      prismaRequest.id,
      prismaRequest.type,
      new Date(prismaRequest.startTime),
      prismaRequest.durationMinutes,
      address,
      prismaRequest.student
    );
  }

  /**
   * Create a new lesson request
   * @route POST /api/lesson-requests
   * @param req - Express request
   * @param res - Express response
   */
  async createLessonRequest(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        startTime,
        durationMinutes,
        addressObj,
        studentId
      } = req.body;

      // Log the request body for debugging
      console.debug('Received lesson request data:', req.body);

      // Validate required fields
      if (!type || !startTime || !durationMinutes || !addressObj || !studentId) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Please provide type, startTime, durationMinutes, addressObj, and studentId'
        });
        return;
      }

      // Convert string dates to Date objects
      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startTime must be a valid date string'
        });
        return;
      }

      // Create lesson request
      const lessonRequest = await lessonRequestService.createLessonRequest({
        type,
        startTime: parsedStartTime,
        durationMinutes: parseInt(durationMinutes, 10),
        addressObj,
        studentId
      });

      // Transform to shared model
      const modelLessonRequest = this.transformToModel(lessonRequest);

      // Automatically create quotes for the lesson request
      const quotes = await teacherQuoteService.createQuotesForLessonRequest(
        lessonRequest.id,
        type
      );

      // Return both the lesson request and the created quotes
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