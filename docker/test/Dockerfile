FROM mcr.microsoft.com/playwright:v1.51.0-noble

# Set working directory
WORKDIR /app

# Enable pnpm via corepack (built into Node.js in Playwright image)
RUN corepack enable
RUN corepack use pnpm@10.3.0

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Copy base config first
COPY tsconfig.json ./

# Environment configuration
COPY env/.env.* ./env/

# Test directories with all configurations
COPY tests/ ./tests/

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