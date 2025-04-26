import { Person } from './Person.js';

// Interface for Student constructor properties, extending PersonProps
interface StudentProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  isActive?: boolean;
  // Added optional timestamps from Person
  createdAt?: Date;
  updatedAt?: Date;
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
} 