import prisma from '../prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { addressService } from '../address/address.service.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { LessonStatus } from '../../shared/models/LessonStatus.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { Student } from '../../shared/models/Student.js';
import { Address, AddressDTO } from '../../shared/models/Address.js';
import { LessonRequestMapper } from './lessonRequest.mapper.js';
// Import errors and validation utils
import { BadRequestError, NotFoundError, AuthorizationError } from '../errors/index.js';
import { isUuid } from '../utils/validation.utils.js';
import { CreateLessonRequestDTO } from './lessonRequest.dto.js'; // Import the new DTO
import { createChildLogger } from '../../config/logger.js';

// Create child logger for lesson request service
const logger = createChildLogger('lesson-request-service');

export class LessonRequestService {
  private readonly prisma = prisma;

  /**
   * Create a new lesson request
   * @param data - Lesson request data DTO
   * @returns Created LessonRequest shared model instance
   */
  async createLessonRequest(lessonRequestDTO: CreateLessonRequestDTO): Promise<LessonRequest> {
    // --- Validation ---
    if (!lessonRequestDTO) {
      throw new BadRequestError('Lesson request data is required.');
    }
    const { type, startTime, durationMinutes, addressDTO, studentId } = lessonRequestDTO;

    // Basic field presence (AddressDTO validated by addressService)
    if (!type || !startTime || !durationMinutes || !addressDTO || !studentId) {
      throw new BadRequestError('Missing required fields: type, startTime, durationMinutes, addressDTO, studentId.');
    }
    // Type validation
    if (!Object.values(LessonType).includes(type)) {
      throw new BadRequestError(`Invalid lesson type: ${type}`);
    }
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      throw new BadRequestError('startTime must be a valid Date object.');
    }
    if (typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestError('durationMinutes must be a positive integer.');
    }
    if (!isUuid(studentId)) {
      throw new BadRequestError('Valid student ID is required.');
    }
    // addressDTO is validated within addressService.create
    // --- End Validation ---

    // Validate that the student exists first (outside transaction is fine)
    const studentCheck = await this.prisma.student.findUnique({
      where: { id: lessonRequestDTO.studentId }
    });
    if (!studentCheck) {
      throw new NotFoundError(`Student with ID ${lessonRequestDTO.studentId} not found`);
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
      logger.error('Error creating lesson request in service:', { error });
      throw error;
    }
  }

  /**
   * Get a lesson request by ID
   * @param id - Lesson request ID
   * @returns LessonRequest shared model instance
   * @throws NotFoundError if lesson request is not found
   */
  async getLessonRequestById(id: string): Promise<LessonRequest> {
    // --- Validation ---
    if (!id || !isUuid(id)) {
      throw new BadRequestError('Valid Lesson Request ID is required.');
    }
    // --- End Validation ---

    const dbLessonRequest = await this.prisma.lessonRequest.findUnique({
      where: { id },
      include: { // Keep includes needed by the mapper
        student: true,
        address: true
      }
    });

    if (!dbLessonRequest) {
      throw new NotFoundError(`Lesson Request with ID ${id} not found`);
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
    // --- Validation ---
    if (!studentId || !isUuid(studentId)) {
      throw new BadRequestError('Valid Student ID is required.');
    }
    // --- End Validation ---

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