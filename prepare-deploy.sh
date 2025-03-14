#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparing for deployment...${NC}"

# Copy shared files to server directory
echo -e "${YELLOW}Copying shared files to server directory...${NC}"
mkdir -p server/shared
cp -r shared/* server/shared/
cp package.json pnpm-lock.yaml tsconfig.json server/

# Copy shared files to frontend directory
echo -e "${YELLOW}Copying shared files to frontend directory...${NC}"
mkdir -p frontend/shared
cp -r shared/* frontend/shared/
mkdir -p frontend/server
cp server/tsconfig.server.json frontend/server/
cp package.json pnpm-lock.yaml tsconfig.json frontend/

# Update Dockerfiles
echo -e "${YELLOW}Updating Dockerfiles...${NC}"

# Update server Dockerfile
cat > server/Dockerfile << 'EOF'
FROM node:20-slim

# Install OpenSSL for Prisma, PostgreSQL client for database checks, and build tools for bcrypt
RUN apt-get update && apt-get install -y openssl python3 make g++ postgresql-client

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild bcrypt
RUN cd node_modules/bcrypt && npm rebuild

# Copy necessary files for building the server
COPY tsconfig.json ./
COPY . ./server/
COPY shared/ ./shared/

# Generate Prisma client
RUN pnpm prisma generate --schema=server/prisma/schema.prisma

# Build the server using a modified version of the build:server script
RUN pnpm exec tsc --project server/tsconfig.server.json --skipLibCheck

# Verify that all routes are properly compiled
RUN grep -q "router.get('/stats'" /app/server/dist/server/routes/teacherRoutes.js || (echo "Stats route not found in compiled file" && exit 1)

# Make the entrypoint script executable
RUN chmod +x /app/server/entrypoint.sh

# Expose the port the server listens on
EXPOSE 3000

# Start the server using the entrypoint script
CMD ["/bin/sh", "/app/server/entrypoint.sh"]
EOF

# Update frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:20-slim as build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies at the root level
RUN pnpm install --frozen-lockfile

# Copy necessary files for building the frontend
COPY tsconfig.json ./
COPY . ./frontend/
COPY shared/ ./shared/
COPY server/ ./server/

# Build the frontend only (not the server)
RUN pnpm exec tsc --project frontend/tsconfig.app.json --skipLibCheck && pnpm exec vite build --config frontend/vite.config.ts

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
EOF

echo -e "${GREEN}Preparation completed successfully!${NC}"
echo -e "${YELLOW}You can now run the deployment script:${NC}"
echo -e "${GREEN}./deploy-fly.sh${NC}" 