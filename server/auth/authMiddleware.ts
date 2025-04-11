import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1); // Exit if the secret is missing
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided.' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token using the secret
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach the decoded payload (user info) to the request object
        // Using `any` for simplicity, consider defining a custom Request type with `user` property
        (req as any).user = decoded;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Unauthorized: Token expired.' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Unauthorized: Invalid token.' });
            return;
        }
        // Handle other potential errors during verification
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Unauthorized.' });
        return;
    }
};

export { authMiddleware }; 