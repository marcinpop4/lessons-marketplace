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
 * @openapi
 * components:
 *   schemas:
 *     Student:
 *       allOf:
 *         - $ref: '#/components/schemas/Person'
 *       type: object
 *       description: Represents a student user.
 *       properties:
 *         isActive:
 *           type: boolean
 *           description: Whether the student account is currently active.
 *           nullable: true # If it can be optional/null
 *       required:
 *         - id # Inherited required fields from Person
 *         - firstName
 *         - lastName
 *         - email
 *         - phoneNumber
 *         - dateOfBirth
 *         # isActive is not required here as it's optional
 */
export class Student extends Person {
  isActive?: boolean;

  // Updated constructor using object destructuring
  constructor(props: StudentProps) { // Use the interface for type annotation
    super(props); // Pass the whole props object to the parent constructor
    this.isActive = props.isActive;
  }
} 