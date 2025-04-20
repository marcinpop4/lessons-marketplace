FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Set default NODE_ENV if not provided at build time
ARG NODE_ENV=test
ENV NODE_ENV=${NODE_ENV}

# Install dependencies
FROM base AS dependencies

# Install OpenSSL and other required packages
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && openssl version \
    && mkdir -p /etc/ssl

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Generate Prisma client before any builds
RUN pnpm prisma:generate

# Build stage
FROM dependencies AS builder
# Build shared code first
RUN pnpm build:shared

# Build server
RUN pnpm build:server

# Production image
FROM base AS runner

# Install required system packages
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && openssl version \
    && mkdir -p /etc/ssl

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies including ts-node and tsconfig-paths
RUN pnpm install --prod --frozen-lockfile

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy .pnpm directory to ensure Prisma client is available
COPY --from=dependencies /app/node_modules/.pnpm ./node_modules/.pnpm

# Copy Prisma schema
COPY --from=dependencies /app/server/prisma ./server/prisma

# Copy tsconfig.json for path resolution
COPY tsconfig.json ./

# Copy other necessary files
COPY env ./env

# Copy entrypoint script
COPY docker/server/server-entrypoint.sh /usr/local/bin/server-entrypoint.sh
RUN chmod +x /usr/local/bin/server-entrypoint.sh

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Set entrypoint script
ENTRYPOINT ["server-entrypoint.sh"]
CMD ["pnpm", "start"]