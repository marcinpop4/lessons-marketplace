import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - this assumes NODE_ENV is set when the tests are run
const nodeEnv = process.env.NODE_ENV;
const envFile = path.resolve(__dirname, `env/.env.${nodeEnv}`);
dotenv.config({ path: envFile });

// Check if running in Docker
const isDocker = process.env.TEST_ENV === 'docker';
// Use DOCKER_FRONTEND_URL when running in Docker, otherwise use FRONTEND_URL
const baseURL = isDocker ? process.env.DOCKER_FRONTEND_URL : process.env.FRONTEND_URL;
const logLevel = process.env.LOG_LEVEL || '1';

// Get timeout values from environment variables or use defaults
const defaultTimeout = parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10);
const defaultActionTimeout = parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT || '15000', 10);
const defaultNavigationTimeout = parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT || '20000', 10);

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
  timeout: defaultTimeout,

  use: {
    baseURL,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: 'on-first-retry',
    headless: true,
    actionTimeout: defaultActionTimeout,
    navigationTimeout: defaultNavigationTimeout,
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
    command: `NODE_NO_WARNINGS=1 LOG_LEVEL=${logLevel} VITE_LOG_LEVEL=${logLevel} NODE_ENV=${nodeEnv} pnpm run dev:full`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: parseInt(logLevel, 10) >= 2 ? 'pipe' : 'ignore', // Only pipe stdout if log level is INFO or higher
    stderr: 'pipe', // Always pipe stderr for critical errors
    env: {
      NODE_NO_WARNINGS: '1'  // Suppress experimental warnings
    }
  },
}); 