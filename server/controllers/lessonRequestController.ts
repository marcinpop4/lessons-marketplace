import { Request, Response, NextFunction } from 'express';
import { lessonRequestService, CreateLessonRequestDTO } from '../services/database/lessonRequestService.js';
import { LessonRequest } from '@prisma/client';
import logger from '../utils/logger.js';

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
   * @param next - Express next function
   */
  async createLessonRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        type,
        startTime,
        durationMinutes,
        addressObj,
        studentId
      } = req.body;

      // Log the request body for debugging
      logger.debug('Received lesson request data:', req.body);

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

      res.status(201).json(lessonRequest);
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
   * Format a lesson request for the frontend
   * @param request - The lesson request from the database
   * @returns Formatted lesson request
   */
  private formatLessonRequest(request: LessonRequest & {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    lessonQuotes?: any[];
  }) {
    const startTime = new Date(request.startTime);
    
    // Format date as YYYY-MM-DD
    const date = startTime.toISOString().split('T')[0];
    
    // Format time as HH:mm
    const time = startTime.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    });

    // Format date and time for display
    const formattedDateTime = startTime.toLocaleDateString() + ' at ' + 
      startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      ...request,
      date,
      time,
      formattedDateTime
    };
  }

  /**
   * Get a lesson request by ID
   * @route GET /api/lesson-requests/:id
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  async getLessonRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        res.status(404).json({
          error: 'Lesson request not found',
          message: `No lesson request found with ID ${id}`
        });
        return;
      }

      const formattedRequest = this.formatLessonRequest(lessonRequest);
      res.json(formattedRequest);
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
   * @param next - Express next function
   */
  async getLessonRequestsByStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const lessonRequests = await lessonRequestService.getLessonRequestsByStudent(studentId);
      
      const formattedRequests = lessonRequests.map(request => this.formatLessonRequest(request));
      res.json(formattedRequests);
    } catch (error) {
      console.error('Error fetching student lesson requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 