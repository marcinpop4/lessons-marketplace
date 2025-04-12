import { Request, Response } from 'express';
import prisma from '../prisma.js';
import type { PrismaClient } from '@prisma/client';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Address } from '../../shared/models/Address.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { LessonStatusValue, LessonStatus } from '@shared/models/LessonStatus';
import { v4 as uuidv4 } from 'uuid';
import { lessonService } from './lesson.service';

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
    if (!prismaLesson?.quote?.lessonRequest?.address) {
      throw new Error('Invalid lesson data structure');
    }

    // Ensure currentStatusId exists before constructing the model
    if (!prismaLesson.currentStatusId) {
      throw new Error(`Lesson data for ${prismaLesson.id} is missing currentStatusId.`);
    }

    return new Lesson(
      prismaLesson.id,
      new LessonQuote(
        prismaLesson.quote.id,
        new LessonRequest(
          prismaLesson.quote.lessonRequest.id,
          prismaLesson.quote.lessonRequest.type,
          new Date(prismaLesson.quote.lessonRequest.startTime),
          prismaLesson.quote.lessonRequest.durationMinutes,
          prismaLesson.quote.lessonRequest.address,
          prismaLesson.quote.lessonRequest.student
        ),
        new Teacher(
          prismaLesson.quote.teacher.id,
          prismaLesson.quote.teacher.firstName,
          prismaLesson.quote.teacher.lastName,
          prismaLesson.quote.teacher.email,
          prismaLesson.quote.teacher.phoneNumber,
          new Date(prismaLesson.quote.teacher.dateOfBirth),
          prismaLesson.quote.teacher.hourlyRates
        ),
        prismaLesson.quote.costInCents,
        prismaLesson.quote.hourlyRateInCents,
        new Date(prismaLesson.quote.createdAt),
        new Date(prismaLesson.quote.expiresAt)
      ),
      prismaLesson.currentStatusId,
      new Date(prismaLesson.confirmedAt)
    );
  },

  /**
   * Create a new lesson from a quote
   * @param req Request with quoteId and confirmedAt in the body
   * @param res Response
   */
  createLesson: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId, confirmedAt } = req.body;

      // Validate required fields
      if (!quoteId) {
        res.status(400).json({
          message: 'Missing required fields. Please provide quoteId.'
        });
        return;
      }

      // Validate that the quote exists
      const quote = await prisma.lessonQuote.findUnique({
        where: { id: quoteId },
        include: {
          lessonRequest: true
        }
      });

      if (!quote) {
        res.status(404).json({
          message: `Lesson quote with ID ${quoteId} not found.`
        });
        return;
      }

      // Check if the quote has expired
      if (new Date(quote.expiresAt) < new Date()) {
        res.status(400).json({
          message: `Lesson quote with ID ${quoteId} has expired.`
        });
        return;
      }

      // Check if a lesson already exists for this quote
      const existingLesson = await prisma.lesson.findFirst({
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

      if (existingLesson) {
        const modelLesson = lessonController.transformToModel(existingLesson);
        res.status(200).json(modelLesson);
        return;
      }

      // Start a transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
        // Create the lesson
        const lesson = await tx.lesson.create({
          data: {
            confirmedAt: confirmedAt ? new Date(confirmedAt) : new Date(),
            quote: {
              connect: { id: quoteId }
            }
          },
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

        // Expire all other quotes for the same lesson request
        await tx.lessonQuote.updateMany({
          where: {
            lessonRequestId: quote.lessonRequestId,
            id: { not: quoteId },
            expiresAt: { gt: new Date() } // Only update unexpired quotes
          },
          data: {
            expiresAt: new Date() // Set to current time to expire immediately
          }
        });

        return lesson;
      });

      const modelLesson = lessonController.transformToModel(result);
      res.status(201).json(modelLesson);
    } catch (error) {
      console.error('Error creating lesson:', error);
      res.status(500).json({
        message: 'An error occurred while creating the lesson',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
   * Update the status of a lesson
   */
  updateLessonStatus: async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    const { status: newStatusValue } = req.body; // Expecting { status: LessonStatusValue }
    const teacherId = req.user?.id; // Use augmented type

    if (!teacherId) {
      res.status(401).json({ error: 'Unauthorized' });
      return; // Added return void
    }

    if (!lessonId || !newStatusValue) {
      res.status(400).json({ error: 'Missing lessonId or status in request' });
      return; // Added return void
    }

    // Validate the incoming status value
    if (!Object.values(LessonStatusValue).includes(newStatusValue)) {
      res.status(400).json({ error: `Invalid status value: ${newStatusValue}` });
      return;
    }

    try {
      // Fetch the current lesson with its current status to validate ownership and transition
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          quote: { include: { teacher: true } },
          currentStatus: true
        }
      });

      if (!lesson) {
        res.status(404).json({ error: `Lesson with ID ${lessonId} not found.` });
        return;
      }

      // Verify the teacher owns the lesson (via the quote)
      if (lesson.quote.teacherId !== teacherId) {
        res.status(403).json({ error: 'Forbidden: You do not own this lesson.' });
        return;
      }

      // Get the current status value
      const currentStatusValue = lesson.currentStatus?.status as LessonStatusValue | undefined;
      if (!currentStatusValue) {
        // Should not happen with proper seeding/creation, but handle defensively
        console.error(`Lesson ${lessonId} is missing a current status.`);
        res.status(500).json({ error: 'Internal server error: Lesson status is inconsistent.' });
        return;
      }

      // Validate the status transition using the static method on LessonStatus model
      if (!LessonStatus.isValidTransition(currentStatusValue, newStatusValue)) {
        res.status(400).json({ error: `Invalid status transition from ${currentStatusValue} to ${newStatusValue}` });
        return;
      }

      // If transition is valid, call the service to perform the update
      // Context can be added here if needed, e.g., { updatedBy: teacherId }
      const newStatusId = await lessonService.updateStatus(prisma, lessonId, newStatusValue, { updatedBy: teacherId });

      res.status(200).json({ message: 'Lesson status updated successfully', newStatusId });

    } catch (error: any) {
      console.error('Error updating lesson status:', error);
      // Handle specific errors thrown by the service or Prisma
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: `Failed to update lesson status: ${error.message}` });
      }
    }
  }
}; 