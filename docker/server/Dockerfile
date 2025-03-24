FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Production image
FROM base AS runner

# Install required system packages
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Fix for esbuild platform compatibility issues
RUN npm uninstall -g esbuild
RUN npm install -g esbuild

# Copy built application
COPY ./dist ./dist

# Copy Prisma schema and migrations for database setup
COPY ./server/prisma/schema.prisma ./server/prisma/schema.prisma
COPY ./server/prisma/migrations ./server/prisma/migrations
COPY ./server/prisma/seed.ts ./server/prisma/seed.ts

# Generate Prisma client - ensures we have a suitable client for the current environment
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Start the application
CMD ["node", "dist/server/index.js"] 