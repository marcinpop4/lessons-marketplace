/**
 * Address model representing a physical location
 * Used for lesson locations and potentially other address needs
 */

// Interface for constructor properties
interface AddressProps {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export class Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Updated constructor using object destructuring
  constructor({ street, city, state, postalCode, country }: AddressProps) {
    this.street = street;
    this.city = city;
    this.state = state;
    this.postalCode = postalCode;
    this.country = country;
  }

  /**
   * Returns a formatted string representation of the address
   */
  toString(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }

  /**
   * Creates an Address object from a string representation
   * @param addressString String representation of an address in format: "street, city, state postalCode, country"
   * @returns Address object
   * @throws Error if the address string is not in the correct format
   */
  static fromString(addressString: string): Address {
    const parts = addressString.split(',').map(part => part.trim());

    if (parts.length !== 4) {
      throw new Error('Address string must contain street, city, state/postal code, and country separated by commas');
    }

    const [street, city, statePostal, country] = parts;

    if (!street || !city || !statePostal || !country) {
      throw new Error('All address components (street, city, state/postal code, country) are required');
    }

    const statePostalParts = statePostal.split(' ').filter(p => p.length > 0);
    if (statePostalParts.length < 2) {
      throw new Error('State and postal code must be provided in the format "state postalCode"');
    }

    const postalCode = statePostalParts.pop();
    const state = statePostalParts.join(' ');

    if (!postalCode || !state) {
      throw new Error('Both state and postal code are required');
    }

    // Use the new constructor pattern
    return new Address({ street, city, state, postalCode, country });
  }
} 