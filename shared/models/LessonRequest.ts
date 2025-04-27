import { LessonType } from './LessonType.js';
import { Student } from './Student.js';
import { Address } from './Address.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     LessonRequest:
 *       type: object
 *       description: A student's request for a lesson.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the lesson request.
 *         type:
 *           $ref: '#/components/schemas/LessonType'
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Requested start time for the lesson.
 *         durationMinutes:
 *           type: integer
 *           description: Requested duration of the lesson in minutes.
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         student:
 *           $ref: '#/components/schemas/Student'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the request was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the request was last updated.
 *       required:
 *         - id
 *         - type
 *         - startTime
 *         - durationMinutes
 *         - address
 *         - student
 *         - createdAt
 *         - updatedAt
 */

/**
 * Properties required to create a LessonRequest instance.
 */
interface LessonRequestProps {
  id: string;
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  address: Address;
  student: Student;
  // Added optional timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * LessonRequest model representing a student's requirements for a lesson
 * This is created before quotes and actual lessons
 */
export class LessonRequest {
  id: string;
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  address: Address;
  student: Student;
  createdAt?: Date;
  updatedAt?: Date;

  constructor({
    id,
    type,
    startTime,
    durationMinutes,
    address,
    student,
    createdAt,
    updatedAt
  }: LessonRequestProps) {
    this.id = id;
    this.type = type;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.address = address;
    this.student = student;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Calculate the end time of the requested lesson based on start time and duration
   */
  get endTime(): Date {
    const end = new Date(this.startTime);
    end.setMinutes(end.getMinutes() + this.durationMinutes);
    return end;
  }

  /**
   * Get the formatted address string
   */
  get formattedAddress(): string {
    return this.address.toString();
  }

  /**
   * Check if the lesson would end after 9pm
   */
  isLessonEndingAfter9pm(): boolean {
    return this.endTime.getHours() >= 21; // 9pm
  }
} 