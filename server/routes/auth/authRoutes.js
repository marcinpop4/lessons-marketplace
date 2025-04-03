import express from 'express';
import prisma from '../../prisma.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
const router = express.Router();
// Set cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN environment variable is required");
}
const REFRESH_TOKEN_EXPIRES_IN = 7; // days
// Hash password
export const hashPassword = async (password) => {
    const saltRounds = 10;
    return bcryptjs.hash(password, saltRounds);
};
// Compare password with hash
export const comparePasswords = async (password, hash) => {
    return bcryptjs.compare(password, hash);
};
// Register endpoint
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, dateOfBirth, userType } = req.body;
        // Validate required fields
        if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !userType) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Validate userType
        if (userType !== 'STUDENT' && userType !== 'TEACHER') {
            res.status(400).json({ error: 'Invalid userType' });
            return;
        }
        // Hash the password
        const hashedPassword = await hashPassword(password);
        // Create user based on userType
        let user;
        try {
            if (userType === 'STUDENT') {
                user = await prisma.student.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        phoneNumber,
                        dateOfBirth: new Date(dateOfBirth),
                        authMethods: ['PASSWORD'],
                    },
                });
            }
            else {
                user = await prisma.teacher.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        phoneNumber,
                        dateOfBirth: new Date(dateOfBirth),
                        authMethods: ['PASSWORD'],
                    },
                });
            }
        }
        catch (error) {
            if (error.code === 'P2002') {
                res.status(409).json({ error: 'Email already exists' });
                return;
            }
            throw error;
        }
        // Generate JWT token
        const accessToken = jwt.sign({
            id: user.id,
            email: user.email,
            userType
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Calculate refresh token expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);
        // Generate refresh token
        const refreshToken = jwt.sign({ id: user.id, type: userType }, JWT_SECRET);
        // Store refresh token in database
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
                expiresAt,
            },
        });
        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, cookieOptions);
        // Return user and access token
        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userType,
            },
            accessToken,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Login endpoint
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, userType } = req.body;
        // Validate required fields
        if (!email || !password || !userType) {
            res.status(400).json({ error: 'Email, password, and userType are required' });
            return;
        }
        // Validate userType
        if (userType !== 'STUDENT' && userType !== 'TEACHER') {
            res.status(400).json({ error: 'Invalid userType' });
            return;
        }
        // Find the user based on userType
        let user;
        if (userType === 'STUDENT') {
            user = await prisma.student.findUnique({ where: { email } });
        }
        else {
            user = await prisma.teacher.findUnique({ where: { email } });
        }
        // Check if user exists
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Check if password is set
        if (!user.password) {
            res.status(401).json({ error: 'Password authentication not set up for this user' });
            return;
        }
        // Check if user's authMethods includes PASSWORD
        if (!user.authMethods.includes('PASSWORD')) {
            res.status(401).json({ error: 'Password authentication not enabled for this user' });
            return;
        }
        // Verify password
        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const accessToken = jwt.sign({
            id: user.id,
            email: user.email,
            userType
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Calculate refresh token expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);
        // Generate refresh token
        const refreshToken = jwt.sign({ id: user.id, type: userType }, JWT_SECRET);
        // Store refresh token in database
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
                expiresAt,
            },
        });
        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, cookieOptions);
        // Return user and access token
        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userType,
            },
            accessToken,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
// Refresh token endpoint
router.post('/refresh-token', async (req, res, next) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ error: 'No refresh token provided' });
            return;
        }
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        // Find refresh token in database
        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                userId: decoded.id,
                userType: decoded.type,
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        if (!storedToken) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }
        // Find user based on token type
        let user;
        if (decoded.type === 'STUDENT') {
            user = await prisma.student.findUnique({ where: { id: decoded.id } });
        }
        else {
            user = await prisma.teacher.findUnique({ where: { id: decoded.id } });
        }
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        // Generate new access token
        const accessToken = jwt.sign({
            id: user.id,
            email: user.email,
            userType: decoded.type
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Calculate new refresh token expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);
        // Generate new refresh token
        const newRefreshToken = jwt.sign({ id: user.id, type: decoded.type }, JWT_SECRET);
        // Update refresh token in database
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                token: newRefreshToken,
                expiresAt,
            },
        });
        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshToken, cookieOptions);
        // Return user and new access token
        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userType: decoded.type,
            },
            accessToken,
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
// Logout endpoint
router.post('/logout', async (req, res, next) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            // Delete refresh token from database
            await prisma.refreshToken.deleteMany({
                where: { token: refreshToken }
            });
        }
        // Clear refresh token cookie
        res.clearCookie('refreshToken', cookieOptions);
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});
// Get current user endpoint
router.get('/me', async (req, res, next) => {
    try {
        // Get authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }
        // Extract token
        const token = authHeader.split(' ')[1];
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        const { id, userType } = decoded;
        // Fetch user data based on userType
        let user;
        if (userType === 'STUDENT') {
            user = await prisma.student.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        }
        else if (userType === 'TEACHER') {
            user = await prisma.teacher.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        }
        else {
            res.status(400).json({ error: 'Invalid user type' });
            return;
        }
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Return user data with userType added
        res.status(200).json({
            ...user,
            userType,
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});
export default router;
