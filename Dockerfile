FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN pnpm prisma generate --schema=server/prisma/schema.prisma

# Build both frontend and backend
RUN pnpm build:full

# Expose ports
EXPOSE 3000 5173

# Start the server in production mode
CMD ["node", "dist/server/index.js"]

# For development mode, use:
# CMD ["pnpm", "dev:full"] 