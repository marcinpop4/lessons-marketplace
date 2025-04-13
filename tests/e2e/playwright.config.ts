import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Assume Playwright runs from project root
const projectRoot = process.cwd(); // Use current working directory as project root

// Load environment variables - NODE_ENV must be set for Playwright runs
const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv) {
    // eslint-disable-next-line no-throw-literal
    throw new Error('[Playwright Config] NODE_ENV environment variable is required but not set. Run with NODE_ENV=e2e-test pnpm test:e2e');
}
// Resolve env file path from project root
const envFile = path.resolve(projectRoot, `env/.env.${nodeEnv}`);
dotenv.config({ path: envFile });

// Check if running in Docker - Assume Docker runs use 'test' env, others use 'e2e-test' or specific NODE_ENV
const isDocker = process.env.TEST_ENV === 'docker';
const effectiveNodeEnv = isDocker ? 'test' : nodeEnv; // Use 'test' for Docker, otherwise the determined nodeEnv

// Use DOCKER_FRONTEND_URL when running in Docker, otherwise use FRONTEND_URL
const baseURL = isDocker ? process.env.DOCKER_FRONTEND_URL : process.env.FRONTEND_URL;
const logLevel = process.env.LOG_LEVEL || '1';

// Get timeout values from environment variables or use defaults
const defaultTimeout = parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10);
const defaultActionTimeout = parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT || '15000', 10);
const defaultNavigationTimeout = parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT || '20000', 10);

export default defineConfig({
    // testDir is relative to this config file location (tests/e2e)
    testDir: '.',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    // Output paths relative to project root
    reporter: [
        ['html', { outputFolder: path.join(projectRoot, 'tests/results/playwright-report'), open: 'never' }],
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
    // Output paths relative to project root
    outputDir: path.join(projectRoot, 'tests/results/screenshots'),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Only start web server in local development (using e2e-test env)
    webServer: isDocker ? undefined : {
        command: `NODE_NO_WARNINGS=1 LOG_LEVEL=${logLevel} VITE_LOG_LEVEL=${logLevel} NODE_ENV=${effectiveNodeEnv} pnpm run dev:full`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: parseInt(logLevel, 10) >= 2 ? 'pipe' : 'ignore', // Only pipe stdout if log level is INFO or higher
        stderr: 'pipe', // Always pipe stderr for critical errors
        env: {
            NODE_NO_WARNINGS: '1',  // Suppress experimental warnings
            NODE_ENV: effectiveNodeEnv // Ensure dev:full runs with correct NODE_ENV
        }
    },
}); 