FROM node:20-slim AS build

# Install required packages and clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    python3 \
    make \
    g++ \
    postgresql-client && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/ 2>/dev/null || mkdir -p ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild bcrypt for the current platform
RUN cd node_modules/bcrypt && npm rebuild

# Copy necessary files for building the server
COPY tsconfig.json ./
COPY server/ ./server/
COPY shared/ ./shared/

# Set production environment
ENV NODE_ENV=production

# Generate Prisma client and build the server
RUN pnpm prisma:generate && \
    pnpm build:server

# Verify build output
RUN ls -la dist/server && \
    echo "Build verification complete"

# Make the entrypoint script executable
RUN chmod +x /app/server/entrypoint.sh

# Production stage
FROM node:20-slim AS production

# Install runtime dependencies and clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    postgresql-client && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built files and runtime assets
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/shared ./dist/shared

# Copy Prisma schema and migrations (these are source files needed for runtime database operations)
COPY --from=build /app/server/prisma ./server/prisma

# Copy entrypoint script
COPY --from=build /app/server/entrypoint.sh ./server/
RUN chmod +x ./server/entrypoint.sh

# Generate Prisma client in the production image
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["/bin/sh", "./server/entrypoint.sh"]
