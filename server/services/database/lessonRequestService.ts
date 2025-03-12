import prisma from '../../prisma.js';

export type LessonType = 'VOICE' | 'GUITAR' | 'BASS' | 'DRUMS';

export interface CreateLessonRequestDTO {
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  address: string;
  studentId: string;
}

export class LessonRequestService {
  /**
   * Create a new lesson request
   * @param data - Lesson request data
   * @returns Created lesson request
   */
  async createLessonRequest(data: CreateLessonRequestDTO) {
    try {
      // Validate that the student exists
      const student = await prisma.student.findUnique({
        where: { id: data.studentId }
      });

      if (!student) {
        throw new Error(`Student with ID ${data.studentId} not found`);
      }

      // Create the lesson request
      const lessonRequest = await prisma.lessonRequest.create({
        data: {
          type: data.type as any, // Type cast for TypeScript
          startTime: data.startTime,
          durationMinutes: data.durationMinutes,
          address: data.address,
          studentId: data.studentId
        }
      });

      return lessonRequest;
    } catch (error) {
      // Re-throw the error for handling in the controller
      throw error;
    }
  }

  /**
   * Get a lesson request by ID
   * @param id - Lesson request ID
   * @returns Lesson request or null if not found
   */
  async getLessonRequestById(id: string) {
    return prisma.lessonRequest.findUnique({
      where: { id },
      include: {
        student: true,
        lessonQuotes: {
          include: {
            teacher: true
          }
        }
      }
    });
  }

  /**
   * Get all lesson requests for a student
   * @param studentId - Student ID
   * @returns Array of lesson requests
   */
  async getLessonRequestsByStudent(studentId: string) {
    return prisma.lessonRequest.findMany({
      where: { studentId },
      include: {
        lessonQuotes: {
          include: {
            teacher: true,
            lessons: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

// Export a singleton instance
export const lessonRequestService = new LessonRequestService(); 