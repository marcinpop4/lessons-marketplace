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

# Build stage
FROM dependencies AS builder

# Copy only the files needed for building
COPY frontend/ frontend/
COPY env/ env/
COPY shared/ shared/
COPY tsconfig.json .

# Verify environment file exists and show its contents
RUN ls -la env/.env.${ENV_TYPE} && \
    echo "Contents of env/.env.${ENV_TYPE}:" && \
    cat env/.env.${ENV_TYPE}

# Export environment variables and run the build
# Make environment variables available during build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN export $(cat env/.env.${ENV_TYPE} | grep -v '^#' | xargs) && \
    pnpm build:frontend

# Production image
FROM nginx:alpine AS runner

# Install curl for healthchecks and openssl for runtime
RUN apk add --no-cache curl openssl

# Remove default nginx configuration and create log directory
RUN rm -rf /etc/nginx/conf.d/* && \
    mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy nginx configuration template - Updated to use the correct path
COPY frontend/config/nginx/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built application from builder
COPY --from=builder /app/dist/frontend /usr/share/nginx/html

# Copy environment file for runtime
COPY --from=builder /app/env /env

# Expose the port nginx runs on
EXPOSE 80

# Process template and start nginx
CMD ["/bin/sh", "-c", "envsubst '${VITE_API_BASE_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 