import { Request, Response } from 'express';
import { addressService } from './address.service.js';
import { BadRequestError } from '../errors/index.js';

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
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error fetching address:', error);
        res.status(500).json({
          message: 'An internal error occurred while fetching the address',
        });
      }
    }
  },

  /**
   * Create a new address
   * @param req Request with address data in the body
   * @param res Response
   */
  createAddress: async (req: Request, res: Response): Promise<void> => {
    try {
      const newAddress = await addressService.create(req.body);

      res.status(201).json(newAddress);
    } catch (error) {
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error creating address:', error);
        res.status(500).json({
          message: 'An internal error occurred while creating the address',
        });
      }
    }
  }
}; 