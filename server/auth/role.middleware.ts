import { Request, Response, NextFunction } from 'express';
import { UserType } from '../../shared/models/UserType.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for role middleware
const logger = createChildLogger('role-middleware');

/**
 * Higher-order function to create role-checking middleware.
 * 
 * @param allowedRoles An array of UserType roles that are allowed to access the route.
 * @returns An Express middleware function.
 */
export const checkRole = (allowedRoles: UserType[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Assume authMiddleware has run and attached user info to req.user
        const user = req.user;

        if (!user || !user.userType) {
            // If user is not attached or doesn't have a userType, forbid access
            // This might also indicate an issue with authMiddleware
            logger.warn('checkRole: User or userType not found on request object.');
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const userRole = user.userType as UserType;

        if (allowedRoles.includes(userRole)) {
            // User role is allowed, proceed to the next middleware or route handler
            next();
        } else {
            // User role is not in the allowed list, forbid access
            logger.warn(`checkRole: User with role '${userRole}' attempted to access restricted route. Allowed: ${allowedRoles.join(', ')}`);
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
    };
}; 