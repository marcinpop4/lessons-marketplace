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

// When running in Docker, use DOCKER_FRONTEND_URL instead of FRONTEND_URL
let frontendUrl = process.env.TEST_ENV === 'docker' 
     ? process.env.DOCKER_FRONTEND_URL 
     : process.env.FRONTEND_URL;

// Ensure FRONTEND_URL has the correct format (includes protocol)
if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
  frontendUrl = `http://${frontendUrl}`;
  console.log(`Adding protocol to frontend URL: ${frontendUrl}`);
}

console.log(`Using frontend URL for tests: ${frontendUrl}`);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  
  // Global timeout settings
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 30000,
  
  // Only include E2E tests, exclude unit tests
  testMatch: 'tests/e2e/**/*.spec.ts',
  
  use: {
    // Use the FRONTEND_URL from environment variables - with protocol if needed
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    
    // Always use headless mode in Docker environments
    headless: true,
    
    // Increase timeouts for CI environments
    actionTimeout: process.env.PLAYWRIGHT_ACTION_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT) : 10000,
    navigationTimeout: process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT) : 15000,
    // Add a small delay between actions in CI for stability
    launchOptions: {
      slowMo: process.env.CI ? 100 : 0,
    },
  },
  outputDir: './tests/screenshots',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Skip web server when testing against Docker
  webServer: process.env.SKIP_WEB_SERVER ? undefined : {
    command: 'NODE_OPTIONS="" pnpm run dev:full',
    url: frontendUrl,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 