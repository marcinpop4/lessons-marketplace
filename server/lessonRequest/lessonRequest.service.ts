import prisma from '../prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { addressService } from '../address/address.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { LessonStatus } from '../../shared/models/LessonStatus.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Student } from '../../shared/models/Student.js';
import { Address, AddressDTO } from '../../shared/models/Address.js';
import { LessonRequestMapper } from './lessonRequest.mapper.js';

export interface LessonRequestDTO {
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  addressDTO: AddressDTO; // Use imported AddressDTO
  studentId: string;
}


export class LessonRequestService {
  private readonly prisma = prisma;

  /**
   * Create a new lesson request
   * @param data - Lesson request data DTO
   * @returns Created LessonRequest shared model instance
   */
  async createLessonRequest(lessonRequestDTO: LessonRequestDTO): Promise<LessonRequest> {
    // Validate that the student exists first (outside transaction is fine)
    const studentCheck = await this.prisma.student.findUnique({
      where: { id: lessonRequestDTO.studentId }
    });
    if (!studentCheck) {
      throw new Error(`Student with ID ${lessonRequestDTO.studentId} not found`);
    }

    try {
      const dbLessonRequest = await this.prisma.$transaction(async (tx) => {
        // 1. Create Address using AddressService, passing the DTO directly
        const addressRecord = await addressService.create(lessonRequestDTO.addressDTO);

        if (!addressRecord || !addressRecord.id) {
          throw new Error('Address creation failed during the transaction or returned null/no ID.');
        }

        // 2. Create the lesson request linking to the new address
        const newLessonRequest = await tx.lessonRequest.create({
          data: {
            type: lessonRequestDTO.type,
            startTime: lessonRequestDTO.startTime,
            durationMinutes: lessonRequestDTO.durationMinutes,
            addressId: addressRecord.id,
            studentId: lessonRequestDTO.studentId,
          },
          include: { // Keep includes needed by the mapper
            student: true,
            address: true
          }
        });
        return newLessonRequest;
      });

      // Use LessonRequestMapper to transform the result
      const lessonRequestModel = LessonRequestMapper.toModel(dbLessonRequest);

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
      include: { // Keep includes needed by the mapper
        student: true,
        address: true
      }
    });

    if (!dbLessonRequest) {
      return null;
    }

    // Use LessonRequestMapper
    return LessonRequestMapper.toModel(dbLessonRequest);
  }

  /**
   * Get all lesson requests for a student
   * @param studentId - Student ID
   * @returns Array of LessonRequest shared model instances
   */
  async getLessonRequestsByStudent(studentId: string): Promise<LessonRequest[]> {
    const dbLessonRequests = await this.prisma.lessonRequest.findMany({
      where: { studentId },
      include: { // Keep includes needed by the mapper
        student: true,
        address: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Use LessonRequestMapper
    return dbLessonRequests.map(dbReq =>
      LessonRequestMapper.toModel(dbReq)
    );
  }
}

// Export singleton instance
export const lessonRequestService = new LessonRequestService(); 