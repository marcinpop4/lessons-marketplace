import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  // Global timeout settings
  timeout: 2000, // Global timeout for all tests - 2 seconds
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    
    // Set timeouts for actions
    actionTimeout: 2000, // Timeout for actions like click, fill - 2 seconds
    navigationTimeout: 2000, // Timeout for navigation - 2 seconds
  },
  outputDir: './tests/screenshots',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run local dev server before starting the tests
  webServer: {
    command: 'pnpm run dev:full',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 