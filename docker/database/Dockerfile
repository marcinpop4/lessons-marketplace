FROM postgres:16

# Enable command trace for all RUN instructions
SHELL ["/bin/bash", "-cx"]

# Install Node.js and pnpm for env configuration
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm@latest \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for dependencies
COPY package.json pnpm-lock.yaml ./

# Copy environment configuration files and scripts
COPY scripts/env-config.ts ./scripts/
COPY env/ ./env/

# Install minimal dependencies needed for env:docker
RUN pnpm add dotenv typescript tsx

# Run the env:docker command to generate environment variables in /app
RUN pnpm env:docker /app

# Expose the PostgreSQL port
EXPOSE 5432

# Default command is inherited from the postgres image
CMD ["postgres"] 