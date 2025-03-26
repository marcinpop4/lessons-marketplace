import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get FRONTEND_URL from environment - no fallback
let frontendUrl = process.env.FRONTEND_URL;

// Ensure FRONTEND_URL has the correct format (includes protocol)
if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
  frontendUrl = `http://${frontendUrl}`;
  console.log(`Adding protocol to FRONTEND_URL: ${frontendUrl}`);
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  
  // Global timeout settings - strict 2s default 
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 2000,
  
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
    actionTimeout: process.env.CI ? 10000 : 5000,
    navigationTimeout: process.env.CI ? 15000 : 10000,
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