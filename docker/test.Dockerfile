FROM mcr.microsoft.com/playwright:v1.51.0-noble

WORKDIR /app

# Install pnpm globally without prompts
ENV PNPM_YES=true
ENV NPM_CONFIG_YES=true
ENV CI=true
RUN npm install -g pnpm@latest

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --unsafe-perm

# Copy necessary files for testing
COPY package.json ./
COPY tsconfig.json tsconfig.*.json ./
COPY jest.config.js playwright.config.ts ./

# Copy source code
COPY frontend/ ./frontend/
COPY server/ ./server/
COPY shared/ ./shared/
COPY tests/ ./tests/
COPY scripts/ ./scripts/

# Set environment variables
ENV NODE_OPTIONS=--experimental-vm-modules
ENV TEST_ENV=docker
ENV PLAYWRIGHT_TIMEOUT=30000
ENV PLAYWRIGHT_ACTION_TIMEOUT=15000
ENV PLAYWRIGHT_NAVIGATION_TIMEOUT=30000

# Create script to run unit tests with proper output
RUN echo '#!/usr/bin/env node\n\
\n\
import { execSync } from "child_process";\n\
\n\
const args = process.argv.slice(2);\n\
const testDir = args[0] || "tests/unit";\n\
const testPattern = args.indexOf("--") > -1 ? args.slice(args.indexOf("--") + 1).join(" ") : "";\n\
\n\
console.log("Running Jest tests in " + testDir);\n\
\n\
const patternArg = testPattern ? `-t "${testPattern}"` : "";\n\
try {\n\
  execSync(`npx jest ${testDir} --verbose ${patternArg}`, { stdio: "inherit" });\n\
  console.log("Tests completed successfully!");\n\
} catch (error) {\n\
  console.error("Tests failed!");\n\
  process.exit(1);\n\
}\n\
' > /app/scripts/docker-run-tests.js

# Create script to run E2E tests in a mock environment
RUN echo '#!/usr/bin/env node\n\
\n\
import { execSync } from "child_process";\n\
\n\
const args = process.argv.slice(2);\n\
const testPattern = args[0] || "";\n\
\n\
console.log("Running Playwright E2E tests");\n\
if (testPattern) {\n\
  console.log(`Test pattern: ${testPattern}`);\n\
}\n\
\n\
const patternArg = testPattern ? `--grep "${testPattern}"` : "";\n\
try {\n\
  // Set environment variables for testing in isolation\n\
  process.env.SKIP_WEB_SERVER = "true";\n\
  process.env.MOCK_API = "true";\n\
  \n\
  // Run the tests using the mock environment\n\
  execSync(`npx playwright test ${patternArg} --reporter=line`, { stdio: "inherit" });\n\
  console.log("E2E tests completed successfully!");\n\
} catch (error) {\n\
  console.error("E2E tests failed!");\n\
  process.exit(1);\n\
}\n\
' > /app/scripts/docker-run-e2e-tests.js

RUN chmod +x /app/scripts/docker-run-tests.js /app/scripts/docker-run-e2e-tests.js

# Default command
CMD ["node", "scripts/docker-run-tests.js", "tests/unit"] 