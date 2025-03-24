/**
 * Docker environment configuration loader.
 * This module loads and validates environment variables for Docker deployment.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment type enum
 */
export enum Environment {
  Development = 'development',
  Production = 'production'
}

/**
 * Database configuration
 */
export interface DbConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  nodeEnv: Environment;
  logLevel: number;
  debug: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  frontendUrl: string;
}

/**
 * Frontend configuration
 */
export interface FrontendConfig {
  apiBaseUrl: string;
  logLevel: number;
  debug: boolean;
}

/**
 * Complete Docker configuration
 */
export interface DockerConfig {
  environment: Environment;
  db: DbConfig;
  server: ServerConfig;
  frontend: FrontendConfig;
}

/**
 * Load environment variables from the appropriate .env file
 * @param env The environment to load variables for
 * @returns The loaded environment variables
 */
export function loadEnvironment(env: Environment = Environment.Development): DockerConfig {
  const envFile = env === Environment.Production ? '.env.production' : '.env';
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, envFile);
  
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file ${envFile} not found at ${envPath}`);
  }
  
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    throw new Error(`Error loading environment variables from ${envFile}: ${result.error.message}`);
  }
  
  // Validate required environment variables
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'PORT',
    'JWT_SECRET'
  ];
  
  for (const key of requiredVars) {
    if (!process.env[key]) {
      throw new Error(`Required environment variable ${key} is missing in ${envFile}`);
    }
  }
  
  // Parse and return the configuration
  return {
    environment: env,
    db: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      ssl: process.env.DB_SSL === 'true',
      poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: (process.env.NODE_ENV as Environment) || Environment.Development,
      logLevel: parseInt(process.env.LOG_LEVEL || '2', 10),
      debug: process.env.DEBUG === 'true',
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    frontend: {
      apiBaseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
      logLevel: parseInt(process.env.VITE_LOG_LEVEL || '2', 10),
      debug: process.env.VITE_DEBUG === 'true'
    }
  };
} 