FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Copy the entire codebase to have access to all files early in the build process
COPY . .

# Install dependencies
FROM base AS dependencies
RUN npm install -g pnpm
# Install OpenSSL which is required for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
# Make environment variables available during build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Pass the environment variable explicitly to the build command
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} pnpm build:frontend

# Production image
FROM nginx:alpine

# Install curl for healthchecks and openssl for runtime
RUN apk add --no-cache curl openssl

# Remove default nginx configuration and create log directory
RUN rm -rf /etc/nginx/conf.d/* && \
    mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy custom nginx configuration template
COPY frontend/config/nginx/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built files from builder stage
COPY --from=builder /app/dist/frontend /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Process template and start nginx
CMD ["/bin/sh", "-c", "envsubst '${VITE_API_BASE_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 