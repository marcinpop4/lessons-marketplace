import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { AddressMapper } from '../address/address.mapper.js';
import { StudentMapper } from '../student/student.mapper.js';
import { Prisma } from '@prisma/client';

// Import necessary Prisma types
import type { LessonRequest as DbLessonRequest, Student as DbStudent, Address as DbAddress } from '@prisma/client';

// Define Prisma types for includes required by the mapper
type DbLessonRequestWithRelations = Prisma.LessonRequestGetPayload<{
    include: {
        student: true,
        address: true
    }
}>;

/**
 * Maps between Prisma LessonRequest objects and shared LessonRequest models.
 */
export class LessonRequestMapper {
    /**
     * Maps a Prisma LessonRequest object with included relations to a shared LessonRequest model instance.
     * @param dbLessonRequest The LessonRequest object from Prisma with included relations.
     * @returns A new instance of the shared LessonRequest model.
     */
    public static toModel(dbLessonRequest: DbLessonRequestWithRelations): LessonRequest {
        const {
            id,
            type,
            startTime,
            durationMinutes,
            createdAt,
            updatedAt
        } = dbLessonRequest;

        // Use the appropriate mappers to transform nested objects
        const studentModel = StudentMapper.toModel(dbLessonRequest.student);
        const addressModel = AddressMapper.toModel(dbLessonRequest.address);

        // Construct the shared model instance
        return new LessonRequest({
            id,
            type: type as unknown as LessonType,
            startTime,
            durationMinutes,
            student: studentModel,
            address: addressModel,
            createdAt: createdAt ?? undefined,
            updatedAt: updatedAt ?? undefined
        });
    }
} 