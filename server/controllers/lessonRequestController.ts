import { Request, Response } from 'express';
import { lessonRequestService } from '../services/database/lessonRequestService.js';

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
      console.log('Received lesson request data:', req.body);

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

      return res.json(lessonRequest);
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
      
      return res.json(lessonRequests);
    } catch (error) {
      console.error('Error fetching student lesson requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  }
}

// Export a singleton instance
export const lessonRequestController = new LessonRequestController(); 