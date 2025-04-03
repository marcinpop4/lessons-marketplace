import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import { teacherQuoteService } from '../services/teacherQuoteService.js';

const prismaClient = new PrismaClient();

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * Create quotes for a lesson request
   * @param req Request with lessonRequestId and lessonType in the body
   * @param res Response
   * @param next NextFunction
   */
  createLessonQuotes: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId, lessonType } = req.body;

      // Validate required fields
      if (!lessonRequestId || !lessonType) {
        res.status(400).json({
          message: 'Missing required fields. Please provide lessonRequestId and lessonType.'
        });
        return;
      }

      const quotes = await teacherQuoteService.createQuotesForLessonRequest(lessonRequestId, lessonType);
      res.status(201).json(quotes);
    } catch (error) {
      console.error('Error creating lesson quotes:', error);
      res.status(500).json({
        message: 'An error occurred while creating lesson quotes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get a lesson quote by ID
   * @param req Request with quoteId as a route parameter
   * @param res Response
   * @param next NextFunction
   */
  getLessonQuoteById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const lessonQuote = await prismaClient.lessonQuote.findUnique({
        where: { id },
        include: {
          lessonRequest: true,
          teacher: true
        }
      });

      if (!lessonQuote) {
        res.status(404).json({
          message: `Lesson quote with ID ${id} not found.`
        });
        return;
      }

      res.status(200).json(lessonQuote);
    } catch (error) {
      console.error('Error fetching lesson quote:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the lesson quote',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get quotes for a lesson request
   * @param req Request with lessonRequestId as a route parameter
   * @param res Response
   * @param next NextFunction
   */
  getLessonQuotesByRequestId: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId } = req.params;

      // Validate the request ID
      if (!lessonRequestId) {
        res.status(400).json({ error: 'Lesson request ID is required' });
        return;
      }

      const quotes = await teacherQuoteService.getQuotesByLessonRequest(lessonRequestId);
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching lesson quotes:', error);
      res.status(500).json({ error: 'Failed to fetch lesson quotes' });
    }
  },

  /**
   * Accept a lesson quote
   * @param req Request with quoteId as a route parameter
   * @param res Response
   * @param next NextFunction
   */
  acceptLessonQuote: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { quoteId } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Check if the user is a student
      if (userType !== 'STUDENT') {
        res.status(403).json({ error: 'Only students can accept quotes' });
        return;
      }

      // Get the quote with the lesson request
      const quote = await prismaClient.lessonQuote.findUnique({
        where: { id: quoteId },
        include: {
          lessonRequest: true,
          teacher: true
        }
      });

      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      // Check if the quote belongs to the student's request
      if (quote.lessonRequest.studentId !== userId) {
        res.status(403).json({ error: 'You can only accept quotes for your own lesson requests' });
        return;
      }

      // Check if the quote has already been accepted (a lesson already exists)
      const existingLesson = await prismaClient.lesson.findFirst({
        where: {
          quoteId
        }
      });

      if (existingLesson) {
        res.status(400).json({ error: 'This quote has already been accepted' });
        return;
      }

      // Check if the quote has expired
      if (new Date(quote.expiresAt) < new Date()) {
        res.status(400).json({ error: 'This quote has expired' });
        return;
      }

      // Create the lesson
      const lesson = await prismaClient.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
        // Create the lesson
        const newLesson = await tx.lesson.create({
          data: {
            quote: {
              connect: { id: quoteId }
            }
          },
          include: {
            quote: {
              include: {
                lessonRequest: true,
                teacher: true
              }
            }
          }
        });

        return newLesson;
      });

      res.status(201).json({
        message: 'Quote accepted successfully',
        lesson
      });
    } catch (error) {
      console.error('Error accepting lesson quote:', error);
      res.status(500).json({ error: 'Failed to accept lesson quote' });
    }
  }
}; 