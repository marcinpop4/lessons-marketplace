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
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Verify OpenSSL installation and configure for Prisma
RUN openssl version && \
    mkdir -p /etc/ssl && \
    echo "OpenSSL configured for Prisma"

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
    ca-certificates \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Verify OpenSSL installation and configure for Prisma
RUN openssl version && \
    mkdir -p /etc/ssl && \
    echo "OpenSSL configured for Prisma"

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and generate client
COPY server/prisma/schema.prisma ./server/prisma/schema.prisma
COPY server/prisma/seed.js ./server/prisma/seed.js
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Install wait-on for database connection checking
RUN npm install --global wait-on

# Copy the scripts directory for Docker-specific operations
COPY scripts ./scripts
# Make sure node can find the module
RUN echo '{"type":"module"}' > ./scripts/package.json 

# Copy the built application
COPY --from=builder /app/dist ./dist

# Copy the wait-for-db script
COPY docker/server/wait-for-db.sh /usr/local/bin/wait-for-db.sh
RUN chmod +x /usr/local/bin/wait-for-db.sh

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Wait for database, run migrations, run seeds, then start server
CMD ["/usr/local/bin/wait-for-db.sh", "sh", "-c", "\
    echo \"[INFO] Running database migrations...\" && \
    pnpm prisma:migrate && \
    echo \"[INFO] Running database seed...\" && \
    pnpm prisma:seed && \
    echo \"[INFO] Starting server...\" && \
    node dist/server/index.js"] 