/**
 * Docker configuration utilities.
 * This module provides utilities for working with Docker environment variables.
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define environment type
type Environment = 'development' | 'production';

/**
 * Load environment variables from the appropriate .env file.
 * @param env The environment to load variables for.
 * @returns An object containing the loaded environment variables.
 */
export function loadEnvVars(env: Environment = 'development'): Record<string, string> {
  const envFile = env === 'production' ? '.env.production' : '.env';
  const rootDir = join(__dirname, '..');
  const envPath = join(rootDir, envFile);
  
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file ${envFile} not found at ${envPath}`);
  }
  
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    throw new Error(`Error loading environment variables from ${envFile}: ${result.error.message}`);
  }
  
  // Validate required environment variables
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'PORT',
    'JWT_SECRET',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Required environment variable ${key} is missing in ${envFile}`);
    }
  }
  
  return process.env as Record<string, string>;
}

/**
 * Get the Docker Compose file path.
 * @returns The path to the Docker Compose file.
 */
export function getComposeFilePath(): string {
  return join(__dirname, '..', 'docker', 'docker-compose.yml');
}

/**
 * Get the Docker build context directory.
 * @returns The path to the Docker build context directory.
 */
export function getBuildContextDir(): string {
  return join(__dirname, '..');
}

/**
 * Determine if we're running in a Docker container.
 * @returns True if running in a Docker container, false otherwise.
 */
export function isRunningInDocker(): boolean {
  return fs.existsSync('/.dockerenv');
} 