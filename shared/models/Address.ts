/**
 * Address model representing a physical location
 * Used for lesson locations and potentially other address needs
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the address
 *           example: 'add_123abc'
 *         street:
 *           type: string
 *           example: '123 Main St'
 *         city:
 *           type: string
 *           example: 'Anytown'
 *         state:
 *           type: string
 *           example: 'CA'
 *         postalCode:
 *           type: string
 *           example: '12345'
 *         country:
 *           type: string
 *           example: 'USA'
 *         # Add other properties like createdAt, updatedAt if they exist and are relevant
 *       required:
 *         - id
 *         - street
 *         - city
 *         - state
 *         - postalCode
 *         - country
 */

// Interface for constructor properties
interface AddressProps {
  id?: string; // Make ID optional as it might not exist before creation
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt?: Date; // Add optional createdAt
  updatedAt?: Date; // Add optional updatedAt
}

/**
 * Data Transfer Object for creating an Address.
 * Represents the data typically received from the client.
 */
export interface AddressDTO {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Note: No ID, createdAt, or updatedAt here
}

export class Address {
  id?: string; // Add optional ID property
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt?: Date; // Add optional property
  updatedAt?: Date; // Add optional property

  // Updated constructor using object destructuring
  constructor({ id, street, city, state, postalCode, country, createdAt, updatedAt }: AddressProps) {
    this.id = id;
    this.street = street;
    this.city = city;
    this.state = state;
    this.postalCode = postalCode;
    this.country = country;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Returns a formatted string representation of the address
   */
  toString(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }
} 