import { Request, Response } from 'express';
import { lessonRequestService } from '../services/database/lessonRequestService.js';
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
   */
  async createLessonRequest(req: Request, res: Response) {
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
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Please provide type, startTime, durationMinutes, addressObj, and studentId'
        });
      }

      // Convert string dates to Date objects
      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'startTime must be a valid date string'
        });
      }

      // Create lesson request
      const lessonRequest = await lessonRequestService.createLessonRequest({
        type,
        startTime: parsedStartTime,
        durationMinutes: parseInt(durationMinutes, 10),
        addressObj,
        studentId
      });

      return res.status(201).json(lessonRequest);
    } catch (error) {
      console.error('Error creating lesson request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific errors
      if (errorMessage.includes('not found')) {
        return res.status(404).json({ error: errorMessage });
      }
      
      return res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }

  /**
   * Format a lesson request for the frontend
   * @param lessonRequest - The lesson request from the database
   * @returns Formatted lesson request
   */
  private formatLessonRequest(lessonRequest: any) {
    const startTime = new Date(lessonRequest.startTime);
    
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
      ...lessonRequest,
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
   */
  async getLessonRequestById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lessonRequest = await lessonRequestService.getLessonRequestById(id);

      if (!lessonRequest) {
        return res.status(404).json({
          error: 'Lesson request not found',
          message: `No lesson request found with ID ${id}`
        });
      }

      const formattedRequest = this.formatLessonRequest(lessonRequest);
      return res.json(formattedRequest);
    } catch (error) {
      console.error('Error fetching lesson request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }

  /**
   * Get all lesson requests for a student
   * @route GET /api/lesson-requests/student/:studentId
   * @param req - Express request
   * @param res - Express response
   */
  async getLessonRequestsByStudent(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const lessonRequests = await lessonRequestService.getLessonRequestsByStudent(studentId);
      
      const formattedRequests = lessonRequests.map(request => this.formatLessonRequest(request));
      return res.json(formattedRequests);
    } catch (error) {
      console.error('Error fetching student lesson requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 