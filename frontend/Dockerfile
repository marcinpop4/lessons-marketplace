FROM node:20-slim as build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files with proper structure
COPY frontend/ ./frontend/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Build the frontend with skipLibCheck to avoid TypeScript errors
ENV NODE_ENV=production
RUN pnpm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy config script if it exists
COPY frontend/create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh || true

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
