import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory path in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - this assumes ENV_TYPE is set when the tests are run
const envType = process.env.ENV_TYPE;
const envFile = path.resolve(__dirname, `env/.env.${envType}`);
dotenv.config({ path: envFile });

// Check if running in Docker
const isDocker = process.env.TEST_ENV === 'docker';
// Use DOCKER_FRONTEND_URL when running in Docker, otherwise use FRONTEND_URL
const baseURL = isDocker ? process.env.DOCKER_FRONTEND_URL : process.env.FRONTEND_URL;
const logLevel = process.env.LOG_LEVEL || '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './tests/results/playwright-report', open: 'never' }],
    ['list'] // More compact reporter for cleaner output
  ],

  // Global timeout settings
  timeout: 30000,

  use: {
    baseURL,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 20000,
    trace: 'retain-on-failure'
  },
  outputDir: './tests/results/screenshots',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start web server in local development
  webServer: isDocker ? undefined : {
    command: `NODE_NO_WARNINGS=1 LOG_LEVEL=${logLevel} VITE_LOG_LEVEL=${logLevel} ENV_TYPE=${envType} pnpm run dev:full`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: parseInt(logLevel, 10) >= 2 ? 'pipe' : 'ignore', // Only pipe stdout if log level is INFO or higher
    stderr: 'pipe', // Always pipe stderr for critical errors
    env: {
      NODE_NO_WARNINGS: '1'  // Suppress experimental warnings
    }
  },
}); 