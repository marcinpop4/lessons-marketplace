import express from 'express';
import { addressController } from '../controllers/addressController.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     description: Retrieve an address by its ID
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the address to get
 *     responses:
 *       200:
 *         description: Address object
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.get('/:id', addressController.getAddressById);

export default router; 