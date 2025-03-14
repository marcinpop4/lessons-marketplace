FROM node:20-slim as build

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Debug: List directories
RUN ls -la && ls -la tsconfig.app.json

# Build the frontend
RUN pnpm exec tsc --project tsconfig.app.json --skipLibCheck && pnpm exec vite build

# Production stage with Nginx
FROM nginx:alpine

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy a custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a runtime configuration script that will be populated at container startup
COPY create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# For development mode, use:
# CMD ["pnpm", "dev:full"] 