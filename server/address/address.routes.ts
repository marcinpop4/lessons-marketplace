import express, { Router } from 'express';
import { addressController } from './address.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

router.get('/:id', authMiddleware, checkRole([UserType.STUDENT]), addressController.getAddressById);

router.post('/', authMiddleware, checkRole([UserType.STUDENT]), addressController.createAddress);

export default router; 