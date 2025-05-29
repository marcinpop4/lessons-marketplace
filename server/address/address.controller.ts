import { Request, Response, NextFunction } from 'express';
import { addressService } from './address.service.js';
import { UserType } from '../../shared/models/UserType.js';
import { BadRequestError, NotFoundError, AuthorizationError } from '../errors/index.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for address controller
const logger = createChildLogger('address-controller');

/**
 * Controller for address-related operations
 */
export const addressController = {
  /**
   * Get an address by ID
   * @param req Request with id as a route parameter
   * @param res Response
   */
  getAddressById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const address = await addressService.findById(id);

      if (!address) {
        throw new NotFoundError(`Address with ID ${id} not found.`);
      }

      res.status(200).json(address);
    } catch (error) {
      logger.error('Error fetching address:', { error });
      next(error);
    }
  },

  /**
   * Create a new address
   * @param req Request with address data in the body
   * @param res Response
   */
  createAddress: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const newAddress = await addressService.create(req.body);

      res.status(201).json(newAddress);
    } catch (error) {
      logger.error('Error creating address:', { error });
      next(error);
    }
  }
}; 