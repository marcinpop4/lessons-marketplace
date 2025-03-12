import { Request, Response } from 'express';
import prisma from '../prisma.js';

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
  }
}; 