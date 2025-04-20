FROM mcr.microsoft.com/playwright:v1.51.0-noble

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copy base config first
COPY tsconfig.json ./

# Environment configuration
COPY env/.env.* ./env/

# Test directories with all configurations
COPY tests/ ./tests/

# Copy tsconfig.test.json to root as a backup
# Some Jest configs might look for it here
COPY tests/tsconfig.test.json ./tsconfig.test.json

# Frontend code (needed for some tests)
COPY frontend/ ./frontend/

# Server code (needed for some tests)
COPY server/ ./server/

# Shared code (needed for tests)
COPY shared/ ./shared/

# COPY the new entrypoint script
COPY docker/test/entrypoint.sh /app/entrypoint.sh

# Make the script executable
RUN chmod +x /app/entrypoint.sh

# Set the entrypoint script as the default command
CMD ["/app/entrypoint.sh"]