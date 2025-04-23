import { PrismaClient, Address } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

class AddressService {
    private readonly prisma = prisma;

    /**
     * Creates a new address.
     * @param addressData Data for the new address.
     * @param tx Optional transaction client
     * @returns The created address object.
     * @throws Error if creation fails.
     */
    async create(addressData: Prisma.AddressCreateInput, tx?: PrismaClient): Promise<Address | null> {
        try {
            const client = tx || this.prisma;
            const newAddress = await client.address.create({
                data: addressData
            });
            return newAddress;
        } catch (error) {
            console.error('Error creating address:', error);
            throw new Error(`Failed to create address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find an address by ID
     * @param id Address ID
     * @returns Address or null if not found
     */
    async findById(id: string): Promise<Address | null> {
        try {
            return await this.prisma.address.findUnique({
                where: { id }
            });
        } catch (error) {
            console.error('Error finding address:', error);
            throw new Error(`Failed to find address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update an address
     * @param id Address ID
     * @param data Update data
     * @returns Updated address
     */
    async update(id: string, data: Prisma.AddressUpdateInput): Promise<Address | null> {
        try {
            return await this.prisma.address.update({
                where: { id },
                data
            });
        } catch (error) {
            console.error('Error updating address:', error);
            throw new Error(`Failed to update address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const addressService = new AddressService(); 