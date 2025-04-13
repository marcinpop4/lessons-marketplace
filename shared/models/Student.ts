import { Person } from './Person.js';

// Interface for Student constructor properties, extending PersonProps
interface StudentProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
}

/**
 * Student model representing users who can book and attend lessons
 * Extends the base Person model
 */
export class Student extends Person {
  // You could add student-specific properties here in the future
  // For example: preferences, payment information, lesson history

  // Updated constructor using object destructuring
  constructor(props: StudentProps) { // Use the interface for type annotation
    super(props); // Pass the whole props object to the parent constructor
  }
} 