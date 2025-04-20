import * as dotenv from 'dotenv';
// Use require for built-in Node modules in Jest setup
const path = require('path');
const fs = require('fs');

// Log the setup file location
console.log(`[API Tests Setup] Running setup from: ${__filename}`);
console.log(`[API Tests Setup] Current working directory: ${process.cwd()}`);

// Explicitly check if path is loaded before using it
if (!path || typeof path.resolve !== 'function') {
    console.error('[API Tests Setup] FATAL: path module not loaded correctly!');
    process.exit(1); // Exit immediately if path is not available
}

// Check if tsconfig exists - helps diagnose issues
const testTsConfigPath = path.resolve(process.cwd(), 'tests/tsconfig.test.json');
const rootTsConfigPath = path.resolve(process.cwd(), 'tsconfig.test.json');
console.log(`[API Tests Setup] tests/tsconfig.test.json exists: ${fs.existsSync(testTsConfigPath)}`);
console.log(`[API Tests Setup] ./tsconfig.test.json exists: ${fs.existsSync(rootTsConfigPath)}`);

// Assume Jest runs from the project root
const projectRoot = process.cwd();
// Determine the environment, MUST be set explicitly for the test run
const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv) {
    throw new Error('[API Tests Setup] NODE_ENV environment variable is required but not set.');
}

const envFile = path.resolve(projectRoot, `env/.env.${nodeEnv}`);

console.log(`[API Tests Setup] Attempting to load environment variables from: ${envFile}`);
console.log(`[API Tests Setup] env directory exists: ${fs.existsSync(path.resolve(projectRoot, 'env'))}`);
console.log(`[API Tests Setup] Environment file exists: ${fs.existsSync(envFile)}`);

const result = dotenv.config({ path: envFile });

if (result.error) {
    console.error(`[API Tests Setup] Error loading ${envFile}`, result.error);
    // Fail fast if the env file is missing/unreadable for the intended environment
    // Avoid throwing if NODE_ENV was something unexpected, only fail for api-test
    if (nodeEnv === 'api-test') {
        throw new Error(`Could not load environment file ${envFile}: ${result.error.message}`);
    }
} else {
    // Optional: Check if critical variables are loaded
    if (!process.env.DATABASE_URL) {
        console.warn(`[API Tests Setup] Warning: DATABASE_URL not found in ${envFile}`);
    }
    if (!process.env.VITE_API_BASE_URL) {
        console.warn(`[API Tests Setup] Warning: VITE_API_BASE_URL not found in ${envFile}`);
    }
    console.log(`[API Tests Setup] Successfully loaded ${envFile}. VITE_API_BASE_URL=${process.env.VITE_API_BASE_URL}`);
} 