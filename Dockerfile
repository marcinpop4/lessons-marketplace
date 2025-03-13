FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma and other dependencies
RUN apt-get update -y && apt-get install -y openssl

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Copy production environment file
COPY .env.production .env

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Build the application
RUN pnpm run build:full

# Expose the port
EXPOSE 3000

# Run database migrations and start the server
CMD npx prisma migrate deploy --schema=server/prisma/schema.prisma && pnpm start 