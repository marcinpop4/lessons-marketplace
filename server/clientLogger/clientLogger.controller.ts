import { Request, Response, NextFunction } from 'express';
import { clientLoggerService } from './clientLogger.service.js';
import { createChildLogger } from '../../config/logger.js';

const logger = createChildLogger('client-logger-controller');

/**
 * Controller for Client Logger operations
 */
export const clientLoggerController = {
    /**
     * Process client logs submitted via POST request.
     */
    processLogs: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { logs } = req.body;

            const result = await clientLoggerService.processLogs({
                logs,
                ip: req.ip,
                forwardedFor: req.get('X-Forwarded-For')
            });

            res.status(200).json(result);
        } catch (error) {
            logger.error({ err: error }, 'Error processing client logs');
            next(error);
        }
    }
}; 