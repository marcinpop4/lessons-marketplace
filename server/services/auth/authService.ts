import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma.js';
import { AuthMethod, UserType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

interface TokenPayload {
  id: string;
  email: string;
  userType: UserType;
}

// Interface for auth providers
export interface AuthProvider {
  authenticate(credentials: any): Promise<any>;
  register(userData: any): Promise<any>;
}

// Base authentication service that will work with different providers
class AuthService {
  private providers: Record<AuthMethod, AuthProvider>;

  constructor() {
    this.providers = {} as Record<AuthMethod, AuthProvider>;
  }

  registerProvider(method: AuthMethod, provider: AuthProvider) {
    this.providers[method] = provider;
  }

  async authenticate(method: AuthMethod, credentials: any) {
    const provider = this.providers[method];
    if (!provider) {
      throw new Error(`Authentication method ${method} not supported`);
    }
    
    return provider.authenticate(credentials);
  }

  async register(method: AuthMethod, userData: any) {
    const provider = this.providers[method];
    if (!provider) {
      throw new Error(`Authentication method ${method} not supported`);
    }
    
    return provider.register(userData);
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password with hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  async generateRefreshToken(userId: string, userType: UserType): Promise<string> {
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(REFRESH_TOKEN_EXPIRES_IN));

    // Generate a random token
    const token = jwt.sign({ id: userId, type: userType }, JWT_SECRET);

    // Store in database
    const refreshToken = await prisma.refreshToken.create({
      data: {
        token,
        userId,
        userType,
        expiresAt,
      },
    });

    return refreshToken.token;
  }

  // Verify JWT token
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
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
      userType: refreshToken.userType,
    };
  }

  // Revoke refresh token
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  // Revoke all refresh tokens for a user
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
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