FROM node:20-slim

WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.3.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Install flyctl
RUN curl -L https://fly.io/install.sh | sh
ENV PATH="/root/.fly/bin:${PATH}"

# Set environment variables
ENV ENV_TYPE=prod

# Verify flyctl installation and run deployment commands
CMD flyctl version && pnpm fly:deploy:server && pnpm fly:deploy:frontend