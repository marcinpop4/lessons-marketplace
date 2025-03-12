import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';

const prisma = new PrismaClient();

// Extended Request type with user information
interface AuthRequest extends Request {
  user?: JwtPayload & { 
    id: string;
    type: 'STUDENT' | 'TEACHER';
  };
}

// Get quotes for a specific lesson request
export const getLessonQuotesByRequestId = async (req: AuthRequest, res: Response) => {
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
    });

    return res.json(quotes);
  } catch (error) {
    console.error('Error fetching lesson quotes:', error);
    return res.status(500).json({ error: 'Failed to fetch lesson quotes' });
  }
};

// Accept a lesson quote
export const acceptLessonQuote = async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const userId = req.user?.id;
    const userType = req.user?.type;

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

    // Create a confirmed lesson
    const lesson = await prisma.lesson.create({
      data: {
        confirmedAt: new Date().toISOString(),
        quoteId,
      },
    });

    return res.json(lesson);
  } catch (error) {
    console.error('Error accepting lesson quote:', error);
    return res.status(500).json({ error: 'Failed to accept lesson quote' });
  }
};

export default {
  getLessonQuotesByRequestId,
  acceptLessonQuote,
}; 