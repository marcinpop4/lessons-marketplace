import prisma from '../prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { addressService } from '../address/address.service.js';
import { LessonType } from '@shared/models/LessonType.js';
import { LessonStatus } from '@shared/models/LessonStatus.js';

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
    // Validate that the student exists first (outside transaction is fine)
    const student = await prisma.student.findUnique({
      where: { id: data.studentId }
    });
    if (!student) {
      throw new Error(`Student with ID ${data.studentId} not found`);
    }

    try {
      // Use transaction for Address + LessonRequest creation
      const lessonRequest = await prisma.$transaction(async (tx) => {
        // 1. Create Address using AddressService, passing the transaction client
        const addressRecord = await addressService.create(tx as PrismaClient, {
          street: data.addressObj.street,
          city: data.addressObj.city,
          state: data.addressObj.state,
          postalCode: data.addressObj.postalCode,
          country: data.addressObj.country
        });

        // Throw error if address creation failed within the service call (should not return null)
        if (!addressRecord) {
          throw new Error('Address creation failed during the transaction.');
        }

        // 2. Create the lesson request using the new address ID
        const newLessonRequest = await tx.lessonRequest.create({
          data: {
            type: data.type,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
            addressId: addressRecord.id, // Connect via ID
            studentId: data.studentId, // Connect via ID
          },
          include: {
            student: true, // Include student details
            address: true // Include the newly created address details
          }
        });

        return newLessonRequest;
      });

      // Remove password hash from the student object before returning
      if (lessonRequest.student) {
        delete (lessonRequest.student as any).passwordHash;
      }

      return lessonRequest;

    } catch (error) {
      console.error('Error creating lesson request in service:', error);
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
            Lesson: true
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