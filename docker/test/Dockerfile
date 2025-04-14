FROM mcr.microsoft.com/playwright:v1.51.0-noble

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copy only the necessary files for testing
# Base config (needed because tests/tsconfig.test.json extends it)
COPY tsconfig.json ./

# Environment configuration
COPY env/.env.* ./env/

# Test directories (includes tests/tsconfig.json and tests/tsconfig.test.json)
COPY tests/ ./tests/

# Frontend code (needed for some tests)
COPY frontend/ ./frontend/

# Server code (needed for some tests)
COPY server/ ./server/

# Shared code (needed for tests)
COPY shared/ ./shared/

# Set the default command to run tests
CMD ["pnpm", "test:docker"]