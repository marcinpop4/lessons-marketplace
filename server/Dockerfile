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
COPY server/ ./server/
COPY shared/ ./shared/

# Generate Prisma client
RUN pnpm prisma generate --schema=server/prisma/schema.prisma

# List files to debug
RUN ls -la server/

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