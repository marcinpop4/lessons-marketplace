import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller for lesson quote-related operations
 */
export const lessonQuoteController = {
  /**
   * Create a new lesson quote
   * @param req Request with lessonRequestId, teacherId, costInCents, and expiresAt in the body
   * @param res Response
   */
  createLessonQuote: async (req: Request, res: Response): Promise<void> => {
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
      const lessonRequest = await prisma.lessonRequest.findUnique({
        where: { id: lessonRequestId }
      });
      
      if (!lessonRequest) {
        res.status(404).json({ 
          message: `Lesson request with ID ${lessonRequestId} not found.` 
        });
        return;
      }
      
      // Validate that the teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId }
      });
      
      if (!teacher) {
        res.status(404).json({ 
          message: `Teacher with ID ${teacherId} not found.` 
        });
        return;
      }
      
      // Check for existing quotes for this teacher and lesson request
      const existingQuote = await prisma.lessonQuote.findFirst({
        where: {
          lessonRequestId,
          teacherId,
        }
      });
      
      // If a quote already exists, return it instead of creating a new one
      if (existingQuote) {
        console.log(`Quote already exists for teacher ${teacherId} and lesson request ${lessonRequestId}. Returning existing quote.`);
        res.status(200).json(existingQuote);
        return;
      }
      
      // Create the lesson quote
      const lessonQuote = await prisma.lessonQuote.create({
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
      console.error('Error creating lesson quote:', error);
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
   */
  getLessonQuoteById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const lessonQuote = await prisma.lessonQuote.findUnique({
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
   * Get all lesson quotes for a lesson request
   * @param req Request with lessonRequestId as a route parameter
   * @param res Response
   */
  getLessonQuotesByLessonRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonRequestId } = req.params;
      
      const lessonQuotes = await prisma.lessonQuote.findMany({
        where: { lessonRequestId },
        include: {
          teacher: true
        }
      });
      
      res.status(200).json(lessonQuotes);
    } catch (error) {
      console.error('Error fetching lesson quotes:', error);
      res.status(500).json({ 
        message: 'An error occurred while fetching lesson quotes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get quotes for a specific lesson request
  getLessonQuotesByRequestId: async (req: Request, res: Response) => {
    try {
      const { lessonRequestId } = req.params;

      // Validate the request ID
      if (!lessonRequestId) {
        return res.status(400).json({ error: 'Lesson request ID is required' });
      }

      // Get the lesson quotes with teacher and lesson request details
      const quotes = await prisma.lessonQuote.findMany({
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
      const quotesWithRates = quotes.map(quote => ({
        ...quote,
        hourlyRateInCents: Math.round((quote.costInCents * 60) / quote.lessonRequest.durationMinutes)
      }));

      return res.json(quotesWithRates);
    } catch (error) {
      console.error('Error fetching lesson quotes:', error);
      return res.status(500).json({ error: 'Failed to fetch lesson quotes' });
    }
  },

  // Accept a lesson quote
  acceptLessonQuote: async (req: Request, res: Response) => {
    try {
      const { quoteId } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Validate the quote ID
      if (!quoteId) {
        return res.status(400).json({ error: 'Quote ID is required' });
      }

      // Ensure the user is authenticated and is a student
      if (!userId || userType !== 'STUDENT') {
        return res.status(403).json({ error: 'Only students can accept quotes' });
      }

      // Find the quote
      const quote = await prisma.lessonQuote.findUnique({
        where: { id: quoteId },
        include: { lessonRequest: true },
      });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Verify that the quote belongs to the student
      if (quote.lessonRequest.studentId !== userId) {
        return res.status(403).json({ error: 'You are not authorized to accept this quote' });
      }

      // Check if the quote has expired
      if (new Date(quote.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'This quote has expired' });
      }

      // Start a transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        // Create a confirmed lesson
        const lesson = await tx.lesson.create({
          data: {
            confirmedAt: new Date(),
            quoteId,
          },
          include: {
            quote: true
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

        return {
          id: quoteId,
          lesson: {
            id: lesson.id
          }
        };
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error accepting lesson quote:', error);
      return res.status(500).json({ error: 'Failed to accept lesson quote' });
    }
  },
}; 