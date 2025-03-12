import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
        where: { id: quoteId }
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
      
      // Create the lesson
      const lesson = await prisma.lesson.create({
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
      
      res.status(201).json(lesson);
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
  }
}; 