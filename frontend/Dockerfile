FROM node:20-slim AS build

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source files with proper structure
COPY frontend/ ./frontend/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Set production environment
ENV NODE_ENV=production

# Build frontend
RUN pnpm run build:frontend

# Production stage with Nginx
FROM nginx:alpine

# Install Node.js for running the config generator at startup
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

# Set up an entrypoint script to generate config at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-create-config.sh && \
    echo 'tsx /tmp/create-config.ts' >> /docker-entrypoint.d/40-create-config.sh && \
    chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx (default entrypoint will run our script before Nginx starts)
CMD ["nginx", "-g", "daemon off;"]
