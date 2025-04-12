// Type definitions for the Node.js environment
// This helps TypeScript recognize Node.js globals like process.env

/// <reference types="node" />

import { UserType } from '@prisma/client';

// Declare global variables that TypeScript might not recognize
declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DB_HOST?: string;
    DB_PORT?: string;
    DB_NAME?: string;
    DB_USER?: string;
    DB_PASSWORD?: string;
    DB_SSL?: string;
    DB_POOL_SIZE?: string;

    // Server
    PORT?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    COOKIE_SECRET?: string;
    FRONTEND_URL?: string;

    // Logging
    LOG_LEVEL?: string;
    LOG_FILE?: string;
  }
}

// Augment the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: { // Make user optional
        id: string;
        userType: UserType; // Use Prisma UserType
        // Add other potential JWT payload properties here if needed
      };
    }
  }
} 