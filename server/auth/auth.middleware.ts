import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Test comment
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1); // Exit if the secret is missing
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    let token: string | null = null;

    // 1. Try getting token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. If not in header, try getting token from query parameter (for SSE)
    // Check if the request is for the SSE stream route
    if (!token && req.query.token && typeof req.query.token === 'string') {
        // Be cautious about where this token comes from and if it's logged.
        console.log("[Auth] Using token from query parameter for SSE."); // Add log for visibility
        token = req.query.token;
    }

    // 3. If no token found in either place, deny access
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided.' });
        return;
    }

    // 4. Verify the token (same logic as before)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded as Express.Request['user'];
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Unauthorized: Token expired.' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Unauthorized: Invalid token.' });
            return;
        }
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Unauthorized.' });
        return;
    }
};

export { authMiddleware }; 