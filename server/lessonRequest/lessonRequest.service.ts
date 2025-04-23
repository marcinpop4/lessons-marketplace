import prisma from '../prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { addressService } from '../address/address.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { LessonStatus } from '../../shared/models/LessonStatus.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Student } from '../../shared/models/Student.js';
import { Address } from '../../shared/models/Address.js';
import type { LessonRequest as DbLessonRequestPrisma, Student as DbStudentPrisma, Address as DbAddressPrisma } from '@prisma/client';

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

// Define Prisma types for includes required by LessonRequest.fromDb
type DbLessonRequestWithStudentAndAddress = Prisma.LessonRequestGetPayload<{ include: { student: true, address: true } }>;

export class LessonRequestService {
  private readonly prisma = prisma;

  /**
   * Create a new lesson request
   * @param data - Lesson request data
   * @returns Created LessonRequest shared model instance
   */
  async createLessonRequest(data: CreateLessonRequestDTO): Promise<LessonRequest> {
    // Validate that the student exists first (outside transaction is fine)
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId }
    });
    if (!student) {
      throw new Error(`Student with ID ${data.studentId} not found`);
    }

    try {
      const dbLessonRequest = await this.prisma.$transaction(async (tx) => {
        // 1. Create Address using AddressService
        const addressRecord = await addressService.create({
          street: data.addressObj.street,
          city: data.addressObj.city,
          state: data.addressObj.state,
          postalCode: data.addressObj.postalCode,
          country: data.addressObj.country
        });

        // Throw error if address creation failed (service returns null now)
        if (!addressRecord || !addressRecord.id) {
          throw new Error('Address creation failed during the transaction or returned null/no ID.');
        }

        // Create the lesson request including student and address
        const newLessonRequest = await tx.lessonRequest.create({
          data: {
            type: data.type,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
            addressId: addressRecord.id,
            studentId: data.studentId,
          },
          include: {
            student: true, // Include student details
            address: true // Include the newly created address details
          }
        });
        // Return the Prisma object with relations
        return newLessonRequest;
      });

      // Use LessonRequest.fromDb to transform the result
      // Cast needed for nested relations
      const lessonRequestModel = LessonRequest.fromDb(
        dbLessonRequest as DbLessonRequestWithStudentAndAddress, // Use helper type
        dbLessonRequest.student as DbStudentPrisma,
        dbLessonRequest.address as DbAddressPrisma
      );

      return lessonRequestModel;

    } catch (error) {
      console.error('Error creating lesson request in service:', error);
      throw error;
    }
  }

  /**
   * Get a lesson request by ID
   * @param id - Lesson request ID
   * @returns LessonRequest shared model instance or null if not found
   */
  async getLessonRequestById(id: string): Promise<LessonRequest | null> {
    const dbLessonRequest = await this.prisma.lessonRequest.findUnique({
      where: { id },
      include: {
        student: true, // Needed for fromDb
        address: true  // Needed for fromDb
        // Note: Quotes are not needed for LessonRequest model itself
        // lessonQuotes: { include: { teacher: true } }
      }
    });

    if (!dbLessonRequest) {
      return null;
    }

    // Use LessonRequest.fromDb
    // Cast needed for nested relations
    return LessonRequest.fromDb(
      dbLessonRequest as DbLessonRequestWithStudentAndAddress,
      dbLessonRequest.student as DbStudentPrisma,
      dbLessonRequest.address as DbAddressPrisma
    );
  }

  /**
   * Get all lesson requests for a student
   * @param studentId - Student ID
   * @returns Array of LessonRequest shared model instances
   */
  async getLessonRequestsByStudent(studentId: string): Promise<LessonRequest[]> {
    const dbLessonRequests = await this.prisma.lessonRequest.findMany({
      where: { studentId },
      include: {
        student: true, // Needed for fromDb
        address: true, // Needed for fromDb
        // Note: Quotes/Lesson not needed for LessonRequest model itself
        // lessonQuotes: { include: { teacher: true, Lesson: true } }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Use LessonRequest.fromDb and filter out potential nulls if fromDb could return null (it doesn't currently)
    return dbLessonRequests.map(dbReq =>
      LessonRequest.fromDb(
        dbReq as DbLessonRequestWithStudentAndAddress,
        dbReq.student as DbStudentPrisma,
        dbReq.address as DbAddressPrisma
      )
    );
  }
}

// Export singleton instance
export const lessonRequestService = new LessonRequestService(); 