FROM node:20-slim as base

# Install OpenSSL for Prisma
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

# Generate Prisma client
RUN pnpm prisma:generate

# Build stage for shared code, frontend, and server
FROM base as build

# Build everything using our package.json scripts
RUN pnpm build

# Production stage for frontend with Nginx
FROM nginx:alpine as frontend

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create runtime configuration script
COPY frontend/create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Production stage for server
FROM node:20-slim as server

WORKDIR /app

# Copy only what's needed for production
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/shared ./dist/shared
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/entrypoint.sh ./server/
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./

# Install only production dependencies
RUN npm install -g pnpm && \
    apt-get update && apt-get install -y openssl postgresql-client && \
    pnpm install --frozen-lockfile --prod && \
    chmod +x ./server/entrypoint.sh

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["/bin/sh", "./server/entrypoint.sh"] 