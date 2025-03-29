import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Log all environment variables for debugging
console.log('Environment variables:');
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`DOCKER_FRONTEND_URL: ${process.env.DOCKER_FRONTEND_URL}`);

// Determine if we're running in Docker by checking environment variables
const isRunningInDocker = process.env.TEST_ENV === 'docker';
console.log(`Running in Docker: ${isRunningInDocker}`);

// In Docker, always use the frontend container URL
const baseURL = process.env.TEST_ENV === 'docker' 
  ? process.env.DOCKER_FRONTEND_URL
  : process.env.FRONTEND_URL;

console.log(`Using frontend URL for tests: ${baseURL}`);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './tests/results/playwright-report', open: 'never' }],
    ['list']
  ],
  
  // Global timeout settings
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 30000,
  
  // Only include E2E tests, exclude unit tests
  testMatch: 'tests/e2e/**/*.spec.ts',
  
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  outputDir: './tests/results/screenshots',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start web server in local development
  webServer: process.env.TEST_ENV === 'docker' ? undefined : {
    command: 'NODE_OPTIONS="" pnpm run dev:full',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 