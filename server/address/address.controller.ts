import { Request, Response } from 'express';
import prisma from '../prisma.js';

/**
 * Controller for address-related operations
 */
export const addressController = {
  /**
   * Get an address by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getAddressById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const address = await prisma.address.findUnique({
        where: { id }
      });

      if (!address) {
        res.status(404).json({
          message: `Address with ID ${id} not found.`
        });
        return;
      }

      res.status(200).json(address);
    } catch (error) {
      console.error('Error fetching address:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the address',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 