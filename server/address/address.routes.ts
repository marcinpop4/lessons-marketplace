import express, { Router } from 'express';
import { addressController } from './address.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';

const router: Router = express.Router();

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

/**
 * @swagger
 * /api/v1/addresses:
 *   post:
 *     summary: Create a new address
 *     description: Creates a new address entry in the database.
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: [] # Indicates that Bearer authentication is required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               street: { type: string, example: '456 Test Ave' }
 *               city: { type: string, example: 'Testville' }
 *               state: { type: string, example: 'TS' }
 *               postalCode: { type: string, example: '54321' }
 *               country: { type: string, example: 'Testland' }
 *             required: [street, city, state, postalCode, country]
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address' # Reference the shared Address schema if defined elsewhere
 *       400:
 *         description: Bad request (e.g., missing fields)
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    addressController.createAddress
);

export default router; 