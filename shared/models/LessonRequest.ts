import { LessonType } from './LessonType.js';
import { Student } from './Student.js';
import { Address } from './Address.js';
// Import necessary Prisma types
import type { LessonRequest as DbLessonRequest, Student as DbStudent, Address as DbAddress } from '@prisma/client';

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

  constructor({
    id,
    type,
    startTime,
    durationMinutes,
    address,
    student
  }: LessonRequestProps) {
    this.id = id;
    this.type = type;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.address = address;
    this.student = student;
  }

  /**
   * Static factory method to create a LessonRequest instance from Prisma objects.
   * @param dbLessonRequest The plain LessonRequest object from Prisma.
   * @param dbStudent The plain Student object from Prisma.
   * @param dbAddress The plain Address object from Prisma.
   * @returns A new instance of the shared LessonRequest model.
   */
  public static fromDb(
    // Separate arguments
    dbLessonRequest: DbLessonRequest,
    dbStudent: DbStudent,
    dbAddress: DbAddress
  ): LessonRequest {
    // Extract necessary properties from dbLessonRequest
    const { id, type, startTime, durationMinutes } = dbLessonRequest;

    // Transform nested objects using their respective fromDb methods and the provided args
    const studentModel = Student.fromDb(dbStudent);
    const addressModel = Address.fromDb(dbAddress);

    // Construct the shared model instance
    return new LessonRequest({
      id: id,
      type: type as LessonType,
      startTime: new Date(startTime), // Ensure startTime is a Date object
      durationMinutes: durationMinutes,
      student: studentModel,
      address: addressModel
    });
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