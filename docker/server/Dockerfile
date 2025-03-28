FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Copy the entire codebase to have access to all files early in the build process
COPY . .

# Install dependencies
FROM base AS dependencies
RUN npm install -g pnpm

# Install OpenSSL first for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Generate client with OpenSSL available
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma
# Build server code
RUN pnpm build:server

# Production image
FROM base AS runner

# Install required system packages - make sure OpenSSL is installed before Prisma uses it
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and generate client
COPY server/prisma/schema.prisma ./server/prisma/schema.prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Install wait-on for database connection checking
RUN npm install --global wait-on

# Copy the scripts directory for Docker-specific operations
COPY scripts ./scripts
# Make sure node can find the module
RUN echo '{"type":"module"}' > ./scripts/package.json 

# Copy the built application
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE ${PORT}

# Set up command to run migrations, conditional seeding, and start the server
CMD /bin/sh -c '\
    echo "[INFO] Starting server container initialization..." && \
    echo "[INFO] Waiting for database to be ready..." && \
    DB_HOST_VALUE=${DB_HOST:-database} && \
    DB_PORT_VALUE=${DB_PORT:-5432} && \
    echo "[INFO] Connecting to database at $DB_HOST_VALUE:$DB_PORT_VALUE" && \
    npx wait-on -t 60000 tcp:$DB_HOST_VALUE:$DB_PORT_VALUE && \
    echo "[INFO] Running database migrations..." && \
    npx prisma migrate deploy --schema=server/prisma/schema.prisma && \
    if [ "$RUN_SEED" = "true" ]; then \
        echo "[INFO] Running database seed..." && \
        node dist/server/prisma/seed.js; \
    fi && \
    echo "[INFO] Starting server..." && \
    node dist/server/index.js' 