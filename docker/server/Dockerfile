# Build arguments for version consistency
ARG NODE_VERSION=23.10.0
ARG PNPM_VERSION=10.11.1

FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    postgresql-client \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && openssl version \
    && mkdir -p /etc/ssl

# Enable pnpm via corepack and use version from build arg
RUN corepack enable
RUN corepack use pnpm@${PNPM_VERSION}

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Copy prisma schema for client generation
COPY server/prisma ./server/prisma
RUN pnpm prisma:generate:run

# Copy tsconfig for TypeScript compilation
COPY tsconfig.json ./

# Copy config directory for logger and other configs
COPY config ./config

# Copy scripts directory for diagnostic tools
COPY scripts ./scripts

# Copy source directories for development
COPY server ./server
COPY shared ./shared

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Development command with hot reload
CMD ["pnpm", "dev:server"] 