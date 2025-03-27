FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Copy the entire codebase to have access to all files early in the build process
COPY . .

# Install dependencies
FROM base AS dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma
# Build server code
RUN pnpm build:server

# Production image
FROM base AS runner

# Install required system packages
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and generate client
COPY server/prisma/schema.prisma ./server/prisma/schema.prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy the scripts directory for Docker-specific operations
COPY scripts ./scripts
RUN chmod +x scripts/docker-seed.ts

# Copy the built application
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE ${PORT}

# Start the application
CMD ["node", "dist/server/index.js"] 