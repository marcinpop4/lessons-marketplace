// server/auth/auth.constants.ts
export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// JWT configuration (Ensure these are checked at application startup)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN environment variable is required");
}

export { JWT_SECRET, JWT_EXPIRES_IN }; 