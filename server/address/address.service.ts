import { PrismaClient } from '@prisma/client';
// Import DbAddress type from Prisma
import { Address as DbAddress, Prisma } from '@prisma/client';
// Import shared Address model and AddressDTO
import { Address, AddressDTO } from '../../shared/models/Address.js';
import prisma from '../prisma.js';
// Import the new mapper
import { AddressMapper } from './address.mapper.js';
// Import the UUID validation utility
import { isUuid } from '../utils/validation.utils.js';
// Import shared error classes
import { BadRequestError, NotFoundError, AuthorizationError } from '../errors/index.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for address service
const logger = createChildLogger('address-service');

class AddressService {
    private readonly prisma = prisma;

    /**
     * Validates the data transfer object for creating an address.
     * @param addressDTO The address data.
     * @throws {BadRequestError} If validation fails.
     */
    private validateAddressDTO(addressDTO: AddressDTO): void {
        const { street, city, state, postalCode, country } = addressDTO;
        if (!street || !city || !state || !postalCode || !country) {
            throw new BadRequestError('Missing required address fields.');
        }
        // Add any other format/value validations here if needed
        // e.g., postalCode format, country code validation, etc.
    }

    /**
     * Creates a new address after validation.
     * @param addressDTO The data required to create the address (AddressDTO).
     * @returns The created shared Address model instance.
     * @throws {BadRequestError} if input data is invalid.
     * @throws {Error} if creation fails for other reasons.
     */
    async create(addressDTO: AddressDTO): Promise<Address> {
        // 1. Validate Input Data
        this.validateAddressDTO(addressDTO);

        // 2. Proceed with creation if validation passes
        try {
            const newDbAddress = await this.prisma.address.create({
                data: {
                    street: addressDTO.street,
                    city: addressDTO.city,
                    state: addressDTO.state,
                    postalCode: addressDTO.postalCode,
                    country: addressDTO.country
                }
            });
            return AddressMapper.toModel(newDbAddress);
        } catch (error) {
            logger.error('Error creating address in service:', { error });
            throw error;
        }
    }

    /**
     * Find an address by ID after validating the ID format.
     * @param id Address ID
     * @returns Shared Address model instance or null if not found
     * @throws {BadRequestError} if ID format is invalid.
     * @throws {Error} if database query fails.
     */
    async findById(id: string): Promise<Address | null> {
        // 1. Validate Input ID format
        if (!isUuid(id)) {
            throw new BadRequestError('Invalid address ID format.');
        }

        // 2. Proceed with fetch if validation passes
        try {
            const dbAddress = await this.prisma.address.findUnique({
                where: { id }
            });

            if (!dbAddress) {
                return null; // Not found is not an error, handled by controller
            }
            return AddressMapper.toModel(dbAddress);
        } catch (error) {
            logger.error('Error finding address by ID in service:', { error });
            throw error;
        }
    }
}

// Export singleton instance
export const addressService = new AddressService(); 