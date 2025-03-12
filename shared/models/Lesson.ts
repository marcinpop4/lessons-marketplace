import { LessonType } from './LessonType';
import { Teacher } from './Teacher';
import { Student } from './Student';

/**
 * Lesson model representing a specific music lesson offering
 */
export class Lesson {
  id: string;
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  address: string;
  teacher: Teacher;
  student?: Student; // Optional until booked
  
  constructor(
    id: string,
    type: LessonType,
    startTime: Date,
    durationMinutes: number,
    address: string,
    teacher: Teacher,
    student?: Student
  ) {
    this.id = id;
    this.type = type;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.address = address;
    this.teacher = teacher;
    this.student = student;
  }

  /**
   * Calculate the end time of the lesson based on start time and duration
   */
  get endTime(): Date {
    const end = new Date(this.startTime);
    end.setMinutes(end.getMinutes() + this.durationMinutes);
    return end;
  }

  /**
   * Calculate the cost of the lesson based on the teacher's hourly rate
   */
  get cost(): number {
    const hourlyRate = this.teacher.getHourlyRate(this.type);
    if (!hourlyRate) return 0;
    return (hourlyRate * this.durationMinutes) / 60;
  }

  /**
   * Book a lesson for a student
   * @param student The student booking the lesson
   */
  book(student: Student): void {
    this.student = student;
  }
} 