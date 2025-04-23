/**
 * Address model representing a physical location
 * Used for lesson locations and potentially other address needs
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

// Import Prisma Address type
import type { Address as DbAddress } from '@prisma/client';

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
   * Static factory method to create an Address instance from a Prisma Address object.
   * @param dbAddress The plain object returned by Prisma.
   * @returns A new instance of the shared Address model.
   */
  public static fromDb(dbAddress: DbAddress): Address {
    // Exclude potential internal fields if necessary, though Address is simpler
    const { createdAt, updatedAt, ...addressProps } = dbAddress;
    // Construct the shared model instance
    return new Address({
      ...addressProps,
      createdAt: createdAt ?? undefined, // Handle potential null
      updatedAt: updatedAt ?? undefined  // Handle potential null
    });
  }

  /**
   * Returns a formatted string representation of the address
   */
  toString(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }
} 