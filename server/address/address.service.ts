import { PrismaClient, Address } from '@prisma/client';
import { Prisma } from '@prisma/client';

class AddressService {

    /**
     * Creates a new address.
     * @param prisma Prisma client instance
     * @param addressData Data for the new address.
     * @returns The created address object.
     * @throws Error if creation fails.
     */
    async create(prisma: PrismaClient, addressData: Prisma.AddressCreateInput): Promise<Address | null> {
        try {
            const newAddress = await prisma.address.create({
                data: addressData
            });
            return newAddress;
        } catch (error) {
            console.error('Error creating address:', error);
            throw new Error(`Failed to create address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods ---
    // async findById(prisma: PrismaClient, id: string): Promise<Address | null> { ... }
    // async update(prisma: PrismaClient, id: string, data: Prisma.AddressUpdateInput): Promise<Address | null> { ... }
}

export const addressService = new AddressService(); 