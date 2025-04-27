import express, { Router } from 'express';
import { addressController } from './address.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     description: Retrieves an address by its ID. Requires STUDENT role.
 *     tags:
 *       - Addresses
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The address's unique identifier
 *     responses:
 *       '200':
 *         description: Address details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a student
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Address not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authMiddleware, checkRole([UserType.STUDENT]), addressController.getAddressById);

/**
 * @openapi
 * /addresses:
 *   post:
 *     summary: Create a new address
 *     description: Creates a new address. Requires STUDENT role.
 *     tags:
 *       - Addresses
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               street:
 *                 type: string
 *                 example: "123 Main St"
 *               city:
 *                 type: string
 *                 example: "Cityville"
 *               state:
 *                 type: string
 *                 example: "State"
 *               postalCode:
 *                 type: string
 *                 example: "12345"
 *               country:
 *                 type: string
 *                 example: "Country"
 *             required:
 *               - street
 *               - city
 *               - state
 *               - postalCode
 *               - country
 *     responses:
 *       '201':
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address'
 *       '400':
 *         description: Bad request (e.g., missing fields, invalid data)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a student
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, checkRole([UserType.STUDENT]), addressController.createAddress);

export default router; 