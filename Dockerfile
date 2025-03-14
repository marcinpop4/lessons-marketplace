FROM node:20-slim as build

# Install OpenSSL for Prisma and other build essentials
RUN apt-get update && apt-get install -y openssl

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Clean any previous build artifacts
RUN pnpm clean

# Generate Prisma client
RUN pnpm prisma:generate

# Build everything
RUN pnpm build:frontend && pnpm build:server

# Production stage for frontend with Nginx
FROM nginx:alpine as frontend

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy runtime configuration script
COPY frontend/create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Production stage for server
FROM node:20-slim as server

# Install OpenSSL for Prisma and PostgreSQL client for database checks
RUN apt-get update && apt-get install -y openssl postgresql-client

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies (includes @prisma/client)
RUN pnpm install --frozen-lockfile --prod

# Copy built files and runtime assets
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/shared ./dist/shared
COPY --from=build /app/server/prisma ./server/prisma

# Copy entrypoint script
COPY --from=build /app/server/entrypoint.sh ./server/
RUN chmod +x ./server/entrypoint.sh

# Generate Prisma client in the production image
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["/bin/sh", "./server/entrypoint.sh"] 