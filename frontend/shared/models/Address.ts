/**
 * Address model representing a physical location
 * Used for lesson locations and potentially other address needs
 */
export class Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  
  constructor(
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  ) {
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
   * @param addressString String representation of an address
   * @returns Address object
   */
  static fromString(addressString: string): Address {
    // This is a simple implementation and might need to be adjusted
    // based on the expected format of address strings in the system
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length < 3) {
      throw new Error('Invalid address string format');
    }
    
    const street = parts[0];
    const city = parts[1];
    
    // Handle the state and postal code which might be in the format "State PostalCode"
    const statePostalParts = parts[2].split(' ').filter(p => p.length > 0);
    const postalCode = statePostalParts.pop() || '';
    const state = statePostalParts.join(' ');
    
    // Default to US if country is not specified
    const country = parts[3] || 'USA';
    
    return new Address(street, city, state, postalCode, country);
  }
} 