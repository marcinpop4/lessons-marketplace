import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import prisma from '../prisma.js';
import { Prisma, LessonQuote } from '@prisma/client';

const prismaClient = new PrismaClient();

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * Create a new lesson quote
   * @param req Request with lessonRequestId, teacherId, costInCents, and expiresAt in the body
   * @param res Response
   * @param next NextFunction
   */
  createLessonQuote: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId, teacherId, costInCents, expiresAt } = req.body;
      
      // Validate required fields
      if (!lessonRequestId || !teacherId || !costInCents || !expiresAt) {
        res.status(400).json({ 
          message: 'Missing required fields. Please provide lessonRequestId, teacherId, costInCents, and expiresAt.' 
        });
        return;
      }
      
      // Validate that the lesson request exists
      const lessonRequest = await prismaClient.lessonRequest.findUnique({
        where: { id: lessonRequestId }
      });
      
      if (!lessonRequest) {
        res.status(404).json({ 
          message: `Lesson request with ID ${lessonRequestId} not found.` 
        });
        return;
      }
      
      // Validate that the teacher exists
      const teacher = await prismaClient.teacher.findUnique({
        where: { id: teacherId }
      });
      
      if (!teacher) {
        res.status(404).json({ 
          message: `Teacher with ID ${teacherId} not found.` 
        });
        return;
      }
      
      // Check for existing quotes for this teacher and lesson request
      const existingQuote = await prismaClient.lessonQuote.findFirst({
        where: {
          lessonRequestId,
          teacherId,
        }
      });
      
      // If a quote already exists, return it instead of creating a new one
      if (existingQuote) {
        res.status(200).json(existingQuote);
        return;
      }
      
      // Create the lesson quote
      const lessonQuote = await prismaClient.lessonQuote.create({
        data: {
          costInCents,
          expiresAt: new Date(expiresAt),
          lessonRequest: {
            connect: { id: lessonRequestId }
          },
          teacher: {
            connect: { id: teacherId }
          }
        }
      });
      
      res.status(201).json(lessonQuote);
    } catch (error) {
      logger.error('Error creating lesson quote:', error);
      res.status(500).json({ 
        message: 'An error occurred while creating the lesson quote',
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
      logger.error('Error fetching lesson quote:', error);
      res.status(500).json({ 
        message: 'An error occurred while fetching the lesson quote',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  /**
   * Get all lesson quotes for a lesson request
   * @param req Request with lessonRequestId as a route parameter
   * @param res Response
   * @param next NextFunction
   */
  getLessonQuotesByLessonRequest: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lessonRequestId } = req.params;
      
      const lessonQuotes = await prismaClient.lessonQuote.findMany({
        where: { lessonRequestId },
        include: {
          teacher: true
        }
      });
      
      res.status(200).json(lessonQuotes);
    } catch (error) {
      logger.error('Error fetching lesson quotes:', error);
      res.status(500).json({ 
        message: 'An error occurred while fetching lesson quotes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get quotes for a specific lesson request
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

      // Get the lesson quotes with teacher and lesson request details
      const quotes = await prismaClient.lessonQuote.findMany({
        where: {
          lessonRequestId,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          lessonRequest: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform quotes to include hourlyRateInCents
      const quotesWithRates = quotes.map((quote: LessonQuote & { lessonRequest: { durationMinutes: number } }) => ({
        ...quote,
        hourlyRateInCents: Math.round((quote.costInCents * 60) / quote.lessonRequest.durationMinutes)
      }));

      res.json(quotesWithRates);
    } catch (error) {
      logger.error('Error fetching lesson quotes:', error);
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
      logger.error('Error accepting lesson quote:', error);
      res.status(500).json({ error: 'Failed to accept lesson quote' });
    }
  }
}; 