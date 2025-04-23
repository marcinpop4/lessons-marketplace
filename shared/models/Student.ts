import { Person } from './Person.js';
// Import Prisma Student type
import type { Student as DbStudent } from '@prisma/client';

// Interface for Student constructor properties, extending PersonProps
interface StudentProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  isActive?: boolean;
}

/**
 * Student model representing users who can book and attend lessons
 * Extends the base Person model
 */
export class Student extends Person {
  isActive?: boolean;

  // Updated constructor using object destructuring
  constructor(props: StudentProps) { // Use the interface for type annotation
    super(props); // Pass the whole props object to the parent constructor
    this.isActive = props.isActive;
  }

  /**
   * Static factory method to create a Student instance from a Prisma Student object.
   * Handles transformation and sanitization.
   * @param dbStudent The plain object returned by Prisma.
   * @returns A new instance of the shared Student model.
   */
  public static fromDb(dbStudent: DbStudent): Student {
    // Explicitly exclude password and other internal fields
    const { password, isActive, authMethods, createdAt, updatedAt, ...studentProps } = dbStudent;
    // Ensure date is a Date object
    studentProps.dateOfBirth = new Date(studentProps.dateOfBirth);
    // Construct the shared model instance
    return new Student({ ...studentProps, isActive: isActive ?? undefined });
  }
} 