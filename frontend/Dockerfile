FROM node:20-slim AS build

# Install pnpm and clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
# Create shared directory
RUN mkdir -p ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files with proper structure
COPY frontend/ ./frontend/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Set production environment and build
ENV NODE_ENV=production
RUN pnpm run build:frontend

# Production stage with Nginx
FROM nginx:alpine

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy config script and make it executable
COPY frontend/create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh || echo "Config script not found, but continuing"

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
