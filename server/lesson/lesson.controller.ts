import { Request, Response } from 'express';
import prisma from '../prisma.js';
import type { PrismaClient } from '@prisma/client';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Address } from '../../shared/models/Address.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { LessonStatusValue, LessonStatus } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';
import { lessonService } from './lesson.service.js';

/**
 * Controller for lesson-related operations
 */
export const lessonController = {
  /**
   * Transform a Prisma lesson object to a shared model instance
   * @param prismaLesson - Prisma lesson object
   * @returns Shared model instance
   */
  transformToModel(prismaLesson: any): Lesson {
    if (!prismaLesson?.quote?.lessonRequest?.address ||
      !prismaLesson?.quote?.teacher ||
      !prismaLesson?.quote?.lessonRequest?.student ||
      !prismaLesson.currentStatusId // Ensure status ID is present
    ) {
      console.error('Invalid lesson data structure received for transformToModel:', JSON.stringify(prismaLesson, null, 2));
      throw new Error('Invalid lesson data structure for transformation');
    }

    const student = new Student({
      id: prismaLesson.quote.lessonRequest.student.id,
      firstName: prismaLesson.quote.lessonRequest.student.firstName,
      lastName: prismaLesson.quote.lessonRequest.student.lastName,
      email: prismaLesson.quote.lessonRequest.student.email,
      phoneNumber: prismaLesson.quote.lessonRequest.student.phoneNumber,
      dateOfBirth: new Date(prismaLesson.quote.lessonRequest.student.dateOfBirth)
    });

    const address = new Address({
      street: prismaLesson.quote.lessonRequest.address.street,
      city: prismaLesson.quote.lessonRequest.address.city,
      state: prismaLesson.quote.lessonRequest.address.state,
      postalCode: prismaLesson.quote.lessonRequest.address.postalCode,
      country: prismaLesson.quote.lessonRequest.address.country
    });

    const lessonRequest = new LessonRequest({
      id: prismaLesson.quote.lessonRequest.id,
      type: prismaLesson.quote.lessonRequest.type,
      startTime: new Date(prismaLesson.quote.lessonRequest.startTime),
      durationMinutes: prismaLesson.quote.lessonRequest.durationMinutes,
      address,
      student
    });

    const teacher = new Teacher({
      id: prismaLesson.quote.teacher.id,
      firstName: prismaLesson.quote.teacher.firstName,
      lastName: prismaLesson.quote.teacher.lastName,
      email: prismaLesson.quote.teacher.email,
      phoneNumber: prismaLesson.quote.teacher.phoneNumber,
      dateOfBirth: new Date(prismaLesson.quote.teacher.dateOfBirth),
      hourlyRates: prismaLesson.quote.teacher.hourlyRates // Assuming hourlyRates are included in the query
    });

    const lessonQuote = new LessonQuote({
      id: prismaLesson.quote.id,
      lessonRequest,
      teacher,
      costInCents: prismaLesson.quote.costInCents,
      hourlyRateInCents: prismaLesson.quote.hourlyRateInCents,
      createdAt: new Date(prismaLesson.quote.createdAt),
      updatedAt: new Date(prismaLesson.quote.updatedAt)
    });

    // Get the status value from the included relation
    const latestStatus = prismaLesson.lessonStatuses?.[0]?.status as LessonStatusValue;
    if (!latestStatus) {
      // This should ideally not happen if a lesson always has a status, but handle defensively
      console.error(`Lesson ${prismaLesson.id} is missing status information.`);
      throw new Error(`Lesson ${prismaLesson.id} is missing status information.`);
    }

    return new Lesson({
      id: prismaLesson.id,
      quote: lessonQuote,
      currentStatusId: prismaLesson.currentStatusId,
      currentStatus: latestStatus, // Use the status from the included relation
      createdAt: prismaLesson.createdAt,
      updatedAt: prismaLesson.updatedAt
    });
  },

  /**
   * Create a new lesson
   * @route POST /api/lessons
   * @param req Request with quoteId in the body
   * @param res Express response
   */
  createLesson: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.body;

      // Validate required fields
      if (!quoteId) {
        res.status(400).json({ error: 'Missing required field: quoteId' });
        return;
      }

      // Create lesson using the service
      const lesson = await lessonService.create(prisma, quoteId);

      // Transform to shared model
      const modelLesson = lessonController.transformToModel(lesson);

      // Return the created lesson
      res.status(201).json(modelLesson);
    } catch (error) {
      console.error('Error creating lesson:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific errors like quote not found or already used
      if (errorMessage.includes('not found') || errorMessage.includes('already linked')) {
        res.status(404).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Internal server error', message: errorMessage });
    }
  },

  /**
   * Get a lesson by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getLessonById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          quote: {
            include: {
              teacher: true,
              lessonRequest: {
                include: {
                  student: true,
                  address: true
                }
              }
            }
          },
          // Include the related LessonStatus records, ordered by createdAt descending, take 1
          lessonStatuses: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });

      if (!lesson) {
        res.status(404).json({
          message: `Lesson with ID ${id} not found.`
        });
        return;
      }

      const modelLesson = lessonController.transformToModel(lesson);
      res.status(200).json(modelLesson);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the lesson',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get lessons by quote ID
   * @param req Request with quoteId as a route parameter
   * @param res Response
   */
  getLessonsByQuoteId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;

      const lessons = await prisma.lesson.findMany({
        where: { quoteId },
        include: {
          quote: {
            include: {
              teacher: true,
              lessonRequest: {
                include: {
                  student: true,
                  address: true
                }
              }
            }
          }
        }
      });

      const modelLessons = lessons.map(lesson => lessonController.transformToModel(lesson));
      res.status(200).json(modelLessons);
    } catch (error) {
      console.error('Error fetching lessons by quote:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the lessons',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update the status of a specific lesson
   * @route PATCH /api/lessons/:lessonId
   * @param req Request with lessonId in params and { newStatus, context } in body
   * @param res Express response
   */
  updateLessonStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      const { newStatus, context } = req.body; // Extract status and optional context
      const authenticatedTeacherId = req.user?.id; // Get ID from token (added by authMiddleware)

      // Validate input
      if (!lessonId) {
        res.status(400).json({ error: 'Bad Request', message: 'Lesson ID is required.' });
        return;
      }
      if (!newStatus || !Object.values(LessonStatusValue).includes(newStatus as LessonStatusValue)) {
        res.status(400).json({ error: 'Bad Request', message: `Invalid or missing newStatus: ${newStatus}` });
        return;
      }

      // Call the service to update the status
      const updatedLesson = await lessonService.updateStatus(
        prisma, // Pass prisma client
        lessonId,
        newStatus as LessonStatusValue,
        context // Pass optional context
      );

      // Optionally transform the result back to the shared model if needed for the response
      const modelLesson = lessonController.transformToModel(updatedLesson);

      res.status(200).json(modelLesson); // Return the updated lesson

    } catch (error) {
      console.error(`[CONTROLLER] Error updating lesson status for ${req.params.lessonId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific errors from the service
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: 'Not Found', message: errorMessage });
      } else if (errorMessage.includes('Invalid status transition')) {
        res.status(400).json({ error: 'Bad Request', message: errorMessage });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: errorMessage });
      }
    }
  }
}; 