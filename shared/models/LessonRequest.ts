import { LessonType } from './LessonType.js';
import { Student } from './Student.js';
import { Address } from './Address.js';

/**
 * LessonRequest model representing a student's requirements for a lesson
 * This is created before quotes and actual lessons
 */
export class LessonRequest {
  id: string;
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  address: string;
  addressObj?: Address;
  student: Student;
  
  constructor(
    id: string,
    type: LessonType,
    startTime: Date,
    durationMinutes: number,
    address: string,
    student: Student,
    addressObj?: Address
  ) {
    this.id = id;
    this.type = type;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.address = address;
    this.student = student;
    this.addressObj = addressObj;
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
   * If addressObj is available, use it, otherwise use the address string
   */
  get formattedAddress(): string {
    if (this.addressObj) {
      return this.addressObj.toString();
    }
    return this.address;
  }
} 