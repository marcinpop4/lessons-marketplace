FROM node:20-slim AS build

# Install OpenSSL for Prisma and other build essentials
RUN apt-get update && apt-get install -y openssl && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the application
COPY . .

# Set production environment
ENV NODE_ENV=production

# Clean, generate Prisma client, and build
RUN pnpm clean && \
    pnpm prisma:generate && \
    pnpm build:frontend && \
    pnpm build:server

# Production stage for frontend with Nginx
FROM nginx:alpine AS frontend

# Install Node.js for running the config generator
RUN apk add --update nodejs npm

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the TypeScript config generator
COPY frontend/create-config.ts /tmp/
COPY tsconfig.json /tmp/
WORKDIR /tmp

# Install TypeScript dependencies
RUN npm install -g tsx typescript @types/node

# Set up an entrypoint script that runs the config generator at container start
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-create-config.sh && \
    echo 'tsx /tmp/create-config.ts' >> /docker-entrypoint.d/40-create-config.sh && \
    chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx (default entrypoint will run our script before Nginx starts)
CMD ["nginx", "-g", "daemon off;"]

# Production stage for server
FROM node:20-slim AS server

# Set shell for proper environment setup
ENV SHELL=/bin/bash

# Install OpenSSL for Prisma and PostgreSQL client for database checks
RUN apt-get update && \
    apt-get install -y openssl postgresql-client && \
    npm install -g pnpm tsx && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --prod

# Copy built files and runtime assets
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/shared ./dist/shared
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/entrypoint.ts ./server/
COPY --from=build /app/deploy.ts ./

# Generate Prisma client in the production image
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Expose the server port
EXPOSE 3000

# Start the server using the TypeScript entrypoint
CMD ["tsx", "./server/entrypoint.ts"] 