import { LessonType } from '@shared/models/LessonType.js';
import { AddressDTO } from '@shared/models/Address.js'; // Assuming AddressDTO is defined here or re-exported

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateLessonRequestDTO:
 *       type: object
 *       description: Data Transfer Object for creating a lesson request.
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/LessonType'
 *           description: The type of lesson requested.
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: The requested start time for the lesson.
 *         durationMinutes:
 *           type: integer
 *           description: The requested duration of the lesson in minutes.
 *           example: 60
 *         addressDTO:
 *           $ref: '#/components/schemas/AddressDTO' # Reference the AddressDTO schema
 *           description: The address where the lesson will take place.
 *         studentId:
 *           type: string
 *           format: uuid
 *           description: The ID of the student making the request.
 *       required:
 *         - type
 *         - startTime
 *         - durationMinutes
 *         - addressDTO
 *         - studentId
 */
export interface CreateLessonRequestDTO {
    type: LessonType;
    startTime: Date; // Service expects Date, OpenAPI uses string format
    durationMinutes: number;
    addressDTO: AddressDTO;
    studentId: string;
} 