import { LessonType } from './LessonType.js';
import { Student } from './Student.js';

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
  student: Student;
  
  constructor(
    id: string,
    type: LessonType,
    startTime: Date,
    durationMinutes: number,
    address: string,
    student: Student
  ) {
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
} 