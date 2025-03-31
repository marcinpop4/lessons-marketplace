FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Set default ENV_TYPE if not provided at build time
ARG ENV_TYPE=prod
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

# Copy only the files needed for Prisma generation
COPY server/prisma ./server/prisma

# Generate Prisma client
RUN pnpm prisma:generate

# Build stage
FROM dependencies AS builder

# Copy only the files needed for building
COPY server/ server/
COPY env/ env/
COPY shared/ shared/
COPY tsconfig.json .

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

# Copy package files and scripts needed for running commands
COPY package.json pnpm-lock.yaml ./
COPY server/prisma ./server/prisma
COPY scripts/ ./scripts/

# Copy only what's needed for running the server
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
# ENV_TYPE already set from base image

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Start the server directly
CMD ["node", "dist/server/index.js"] 