// Type definitions for the Node.js environment
// This helps TypeScript recognize Node.js globals like process.env

/// <reference types="node" />

// Declare global variables that TypeScript might not recognize
declare namespace NodeJS {
  interface ProcessEnv {
    // Messaging
    MESSAGING_HOST?: string;
    MESSAGING_PORT?: string;
    MESSAGING_USER?: string;
    MESSAGING_PASSWORD?: string;
    MESSAGING_VHOST?: string;
    MESSAGING_RETRY_ATTEMPTS?: string;
    MESSAGING_RETRY_DELAY?: string;
    
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
    NODE_ENV?: 'development' | 'production' | 'test';
    DEBUG?: string;
    LOG_LEVEL?: string;
  }
} 