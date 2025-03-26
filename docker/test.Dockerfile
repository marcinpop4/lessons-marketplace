FROM mcr.microsoft.com/playwright:v1.51.0-noble

# Install Node.js and pnpm
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@latest && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all files
COPY . .

# Generate environment inside Docker container
RUN pnpm env:docker /app

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Make directory for test results
RUN mkdir -p /app/test-results

# Playwright doesn't need browsers to be installed in the image
# because it will use the browsers from the Playwright Docker image

# Set Docker root directory environment variable so that scripts can adjust paths
ENV DOCKER_ROOT_DIR=/app

# Create a dummy entrypoint script with check for environment variables
COPY docker/scripts/test-entrypoint.sh /test-entrypoint.sh
RUN chmod +x /test-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/test-entrypoint.sh"]

# Default command (can be overridden)
CMD ["npx", "jest"]

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
COPY env/ ./env/

# Generate environment configuration for tests
RUN pnpm env:dev /app

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