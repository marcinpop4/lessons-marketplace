import prisma from '../prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { Address } from '../../shared/models/Address.js';
import { LessonType } from '../../../shared/models/LessonType.js';

export interface AddressDTO {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateLessonRequestDTO {
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  addressObj: AddressDTO; // Now required
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

      // Create the lesson request with the address relationship
      return await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
        // Create an Address record
        const addressRecord = await tx.address.create({
          data: {
            street: data.addressObj.street,
            city: data.addressObj.city,
            state: data.addressObj.state,
            postalCode: data.addressObj.postalCode,
            country: data.addressObj.country
          }
        });

        // Create the lesson request with the address relationship
        const lessonRequest = await tx.lessonRequest.create({
          data: {
            type: data.type as any, // Type cast for TypeScript
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
            address: {
              connect: { id: addressRecord.id }
            },
            student: {
              connect: { id: data.studentId }
            }
          },
          include: {
            student: true,
            address: true
          }
        });

        return lessonRequest;
      });
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
        address: true,
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
        address: true,
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