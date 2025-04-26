import type { Address as DbAddress } from '@prisma/client';
import { Address } from '../../shared/models/Address.js';

/**
 * Maps between Prisma Address objects and shared Address models.
 */
export class AddressMapper {
    /**
     * Maps a Prisma Address object to a shared Address model instance.
     * @param dbAddress The plain object returned by Prisma.
     * @returns A new instance of the shared Address model.
     */
    public static toModel(dbAddress: DbAddress): Address {
        // Exclude potential internal fields if necessary, though Address is simpler
        const { createdAt, updatedAt, ...addressProps } = dbAddress;

        // Construct the shared model instance using its constructor
        return new Address({
            ...addressProps, // Includes id, street, city, etc.
            createdAt: createdAt ?? undefined, // Handle potential null
            updatedAt: updatedAt ?? undefined  // Handle potential null
        });
    }

    // Add toDb or other mapping methods if needed in the future
} 