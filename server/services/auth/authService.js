import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma.js';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN environment variable is required");
}
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;
if (!REFRESH_TOKEN_EXPIRES_IN) {
    throw new Error("REFRESH_TOKEN_EXPIRES_IN environment variable is required");
}
// Assertion to satisfy TypeScript since we've already checked that these are defined
const secretKey = JWT_SECRET;
const expiresIn = JWT_EXPIRES_IN;
const refreshExpiresIn = REFRESH_TOKEN_EXPIRES_IN;
// Base authentication service that will work with different providers
class AuthService {
    providers;
    constructor() {
        this.providers = {};
    }
    registerProvider(method, provider) {
        this.providers[method] = provider;
    }
    async authenticate(method, credentials) {
        const provider = this.providers[method];
        if (!provider) {
            throw new Error(`Authentication method ${method} not supported`);
        }
        return provider.authenticate(credentials);
    }
    async register(method, userData) {
        const provider = this.providers[method];
        if (!provider) {
            throw new Error(`Authentication method ${method} not supported`);
        }
        return provider.register(userData);
    }
    // Hash password
    async hashPassword(password) {
        const saltRounds = 10;
        return bcryptjs.hash(password, saltRounds);
    }
    // Compare password with hash
    async comparePassword(password, hash) {
        return bcryptjs.compare(password, hash);
    }
    // Generate JWT token
    generateToken(payload) {
        return jwt.sign(payload, secretKey, { expiresIn: expiresIn });
    }
    // Generate refresh token
    async generateRefreshToken(userId, userType) {
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));
        // Generate a random token
        const token = jwt.sign({ id: userId, type: userType }, secretKey);
        // Store in database
        const refreshToken = await prisma.refreshToken.create({
            data: {
                token,
                userId,
                userType, // This now uses the literal type which matches Prisma's enum
                expiresAt,
            },
        });
        return refreshToken.token;
    }
    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, secretKey);
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    // Verify refresh token
    async verifyRefreshToken(token) {
        const refreshToken = await prisma.refreshToken.findUnique({
            where: {
                token,
                revokedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
        if (!refreshToken) {
            return null;
        }
        return {
            id: refreshToken.userId,
            email: '', // We don't store email in refresh token
            userType: refreshToken.userType, // Type assertion to match the TokenPayload type
        };
    }
    // Revoke refresh token
    async revokeRefreshToken(token) {
        await prisma.refreshToken.update({
            where: { token },
            data: { revokedAt: new Date() },
        });
    }
    // Revoke all refresh tokens for a user
    async revokeAllUserRefreshTokens(userId) {
        await prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null
            },
            data: { revokedAt: new Date() },
        });
    }
}
export default new AuthService();
