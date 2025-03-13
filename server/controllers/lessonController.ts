import { Request, Response } from 'express';
import prisma from '../prisma.js';

/**
 * Controller for lesson-related operations
 */
export const lessonController = {
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
              lessonRequest: true
            }
          }
        }
      });
      
      if (existingLesson) {
        console.log(`Lesson already exists for quote ${quoteId}. Returning existing lesson.`);
        res.status(200).json(existingLesson);
        return;
      }
      
      // Start a transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
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
                lessonRequest: true
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
      
      res.status(201).json(result);
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
                  student: true
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
      
      res.status(200).json(lesson);
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
                  student: true
                }
              }
            }
          }
        }
      });
      
      res.status(200).json(lessons);
    } catch (error) {
      console.error('Error fetching lessons by quote:', error);
      res.status(500).json({ 
        message: 'An error occurred while fetching the lessons',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 