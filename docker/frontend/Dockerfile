FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy the entire codebase first
COPY . .

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Generate environment inside Docker container with explicit output directory
RUN pnpm env:docker /app

# Build frontend
RUN pnpm build:frontend

# Final nginx image
FROM nginx:alpine

# Install Node.js and pnpm
RUN apk add --no-cache nodejs npm && \
    npm install -g pnpm && \
    apk del npm

# Remove default nginx configuration and create log directory
RUN rm -rf /etc/nginx/conf.d/* && \
    mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy custom nginx configuration template
COPY frontend/config/nginx/nginx.conf /etc/nginx/templates/default.conf.template

# Copy everything from builder stage
WORKDIR /app
COPY --from=builder /app /app

# Copy built frontend files to nginx html directory
COPY --from=builder /app/dist/frontend /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Process template and start nginx
CMD ["/bin/sh", "-c", "set -a && . /app/.env && envsubst '$${VITE_API_BASE_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 