import { defineConfig, devices } from '@playwright/test';

// Check for required environment variables
if (!process.env.FRONTEND_URL) {
  console.error('Error: FRONTEND_URL environment variable is required but not set.');
  console.error('Please ensure this is set in your .env file or passed in the command.');
  process.exit(1);
}

// Ensure FRONTEND_URL has the correct format (includes protocol)
let frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
  frontendUrl = `http://${frontendUrl}`;
  console.log(`Adding protocol to FRONTEND_URL: ${frontendUrl}`);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  // Global timeout settings - strict 2s default 
  timeout: process.env.PLAYWRIGHT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TIMEOUT) : 2000,
  
  use: {
    // Use the FRONTEND_URL from environment variables - with protocol if needed
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    
    // Set strict timeouts - default 2s for fast failure
    actionTimeout: process.env.PLAYWRIGHT_ACTION_TIMEOUT ? 
      parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT) : 2000,
    navigationTimeout: process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ? 
      parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT) : 2000,
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
    command: 'pnpm run dev:full',
    url: frontendUrl,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 