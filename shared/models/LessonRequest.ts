import { LessonType } from './LessonType.js';
import { Student } from './Student.js';
import { Address } from './Address.js';

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