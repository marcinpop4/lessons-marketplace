import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const projectRoot = process.cwd();

// --- Environment Loading --- 
// 1. Check for NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
    console.error('\n*** ERROR [Playwright Config]: NODE_ENV environment variable is not set. ***');
    console.error('Please run Playwright tests with NODE_ENV prefix (e.g., NODE_ENV=development pnpm test:e2e:local).');
    process.exit(1);
}

// 2. Construct .env path and load
const envFilePath = path.resolve(projectRoot, `env/.env.${nodeEnv}`);
const envConfig = dotenv.config({ path: envFilePath });

if (envConfig.error) {
    console.error(`\n*** ERROR [Playwright Config]: Could not load environment file: ${envFilePath} ***`);
    console.error(`Error details: ${envConfig.error.message}`);
    if ((envConfig.error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        console.error('File not found.');
    }
    process.exit(1);
}


// 3. Determine baseURL AFTER loading .env
const baseURL = process.env.FRONTEND_URL;

// 4. Validate baseURL
if (!baseURL) {
    console.error('\n*** ERROR [Playwright Config]: FRONTEND_URL not found in environment variables. ***');
    console.error(`Ensure FRONTEND_URL is defined in ${envFilePath}`);
    process.exit(1);
}


// 5. Process timeout values ONLY if they are set in the environment
const timeoutStr = process.env.PLAYWRIGHT_TIMEOUT;
const actionTimeoutStr = process.env.PLAYWRIGHT_ACTION_TIMEOUT;
const navigationTimeoutStr = process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT;
const expectTimeoutStr = process.env.PLAYWRIGHT_EXPECT_TIMEOUT;

const configOverrides: { timeout?: number } = {};
const useOverrides: { actionTimeout?: number; navigationTimeout?: number } = {};
const expectOverrides: { timeout?: number } = {};

if (timeoutStr) {
    const parsed = parseInt(timeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_TIMEOUT value "${timeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    configOverrides.timeout = parsed;
}

if (actionTimeoutStr) {
    const parsed = parseInt(actionTimeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_ACTION_TIMEOUT value "${actionTimeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    useOverrides.actionTimeout = parsed;
}

if (navigationTimeoutStr) {
    const parsed = parseInt(navigationTimeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_NAVIGATION_TIMEOUT value "${navigationTimeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    useOverrides.navigationTimeout = parsed;
}

if (expectTimeoutStr) {
    const parsed = parseInt(expectTimeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_EXPECT_TIMEOUT value "${expectTimeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    expectOverrides.timeout = parsed;
}


export default defineConfig({
    testDir: '../../dist/tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: path.join(projectRoot, 'tests/results/playwright-report'), open: 'never' }],
        ['list']
    ],
    // Apply timeout override if present, otherwise use default
    ...configOverrides,
    expect: {
        // Only apply the expect timeout override if PLAYWRIGHT_EXPECT_TIMEOUT is set
        ...(expectOverrides.timeout !== undefined && { timeout: expectOverrides.timeout }),
        // Add other default expect properties here if needed, e.g.:
        // toHaveScreenshot: { maxDiffPixels: 10 },
    },
    use: {
        baseURL,
        screenshot: {
            mode: 'only-on-failure',
            fullPage: true
        },
        video: 'on-first-retry',
        headless: true,
        // Apply action/navigation timeout overrides if present, otherwise use defaults
        ...useOverrides,
        trace: 'retain-on-failure'
    },
    outputDir: path.join(projectRoot, 'tests/results/screenshots'),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // No webServer block - managed by orchestrator scripts or docker-compose
}); 