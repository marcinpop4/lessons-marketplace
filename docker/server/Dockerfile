FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Set default ENV_TYPE if not provided at build time
ARG ENV_TYPE=ci
ENV ENV_TYPE=${ENV_TYPE}

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

# Generate Prisma client with ENV_TYPE
RUN ENV_TYPE=${ENV_TYPE} pnpm prisma:generate

# Build stage
FROM dependencies AS builder
# Build server code
RUN ENV_TYPE=${ENV_TYPE} pnpm build:server

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

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy server directory and Prisma files
COPY server/prisma ./server/prisma
COPY scripts ./scripts
COPY env ./env

# Copy entrypoint script
COPY docker/scripts/server-entrypoint.sh /usr/local/bin/server-entrypoint.sh
RUN chmod +x /usr/local/bin/server-entrypoint.sh

# Copy built application
COPY --from=builder /app/dist ./dist

# Set up module resolution for scripts
RUN echo '{"type":"module"}' > ./scripts/package.json 

# Set environment variables
ENV NODE_ENV=production
# ENV_TYPE already set from base image

# Load environment variables from the appropriate .env file if it exists
RUN if [ -f "env/.env.${ENV_TYPE}" ]; then \
    echo "Found env/.env.${ENV_TYPE} file, loading environment variables..."; \
    grep -v '^#' env/.env.${ENV_TYPE} | xargs -I{} echo "export {}" > /tmp/env_vars.sh; \
    chmod +x /tmp/env_vars.sh; \
    else \
    echo "WARNING: env/.env.${ENV_TYPE} file not found!"; \
    fi

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Set entrypoint script
ENTRYPOINT ["server-entrypoint.sh"]
CMD ["pnpm", "start"]