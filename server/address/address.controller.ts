import { Request, Response } from 'express';
import { addressService } from './address.service.js';

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

      const address = await addressService.findById(id);

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
  },

  /**
   * Create a new address
   * @param req Request with address data in the body
   * @param res Response
   */
  createAddress: async (req: Request, res: Response): Promise<void> => {
    try {
      // Basic validation: Check if required fields are present
      const { street, city, state, postalCode, country } = req.body;
      if (!street || !city || !state || !postalCode || !country) {
        res.status(400).json({ message: 'Missing required address fields.' });
        return;
      }

      // Use the service to create the address
      const newAddress = await addressService.create({
        street,
        city,
        state,
        postalCode,
        country
      });

      res.status(201).json(newAddress);
    } catch (error) {
      console.error('Error creating address:', error);
      res.status(500).json({
        message: 'An error occurred while creating the address',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 