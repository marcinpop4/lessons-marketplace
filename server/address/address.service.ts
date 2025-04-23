import { PrismaClient } from '@prisma/client';
// Import DbAddress type from Prisma
import { Address as DbAddress, Prisma } from '@prisma/client';
// Import shared Address model
import { Address } from '../../shared/models/Address.js';
import prisma from '../prisma.js';

class AddressService {
    private readonly prisma = prisma;

    /**
     * Creates a new address.
     * @param addressData Data for the new address.
     * @returns The created shared Address model instance.
     * @throws Error if creation fails.
     */
    async create(addressData: Prisma.AddressCreateInput): Promise<Address | null> {
        try {
            // Use this.prisma directly
            const newDbAddress = await this.prisma.address.create({
                data: addressData
            });
            // Return the shared model instance using fromDb
            return Address.fromDb(newDbAddress);
        } catch (error) {
            console.error('Error creating address:', error);
            // Throw a more specific error or handle Prisma errors if needed
            throw new Error(`Failed to create address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find an address by ID
     * @param id Address ID
     * @returns Shared Address model instance or null if not found
     */
    async findById(id: string): Promise<Address | null> {
        try {
            const dbAddress = await this.prisma.address.findUnique({
                where: { id }
            });

            if (!dbAddress) {
                return null;
            }
            // Return the shared model instance using fromDb
            return Address.fromDb(dbAddress);
        } catch (error) {
            console.error('Error finding address:', error);
            throw new Error(`Failed to find address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update an address
     * @param id Address ID
     * @param data Update data
     * @returns Updated shared Address model instance
     */
    async update(id: string, data: Prisma.AddressUpdateInput): Promise<Address | null> {
        try {
            const updatedDbAddress = await this.prisma.address.update({
                where: { id },
                data
            });
            // Return the shared model instance using fromDb
            return Address.fromDb(updatedDbAddress);
        } catch (error) {
            console.error('Error updating address:', error);
            // Handle specific Prisma errors like P2025 (RecordNotFound) if needed
            throw new Error(`Failed to update address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const addressService = new AddressService(); 