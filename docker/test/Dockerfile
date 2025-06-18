# Build arguments for version consistency
ARG NODE_VERSION
ARG PNPM_VERSION

# Use Node.js version from build arg to match host environment
FROM node:${NODE_VERSION}-bookworm

# Re-declare build args after FROM (they don't persist across FROM)
ARG NODE_VERSION
ARG PNPM_VERSION

# Set working directory
WORKDIR /app

# Install system dependencies required for Playwright browsers and build tools
RUN apt-get update && apt-get install -y \
    # Build dependencies for native modules like bcrypt
    build-essential \
    python3 \
    make \
    g++ \
    # Playwright browser dependencies
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxshmfence1 \
    # Additional dependencies
    xvfb \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-unifont \
    libfontconfig1 \
    libfreetype6 \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack and use version from build arg
RUN corepack enable
RUN corepack use pnpm@${PNPM_VERSION}

# Copy package files and install dependencies (including Playwright)
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Install Playwright browsers after pnpm install
RUN npx playwright install --with-deps

# Copy base config first
COPY tsconfig.json ./

# Environment configuration
COPY env/.env.* ./env/

# Test directories with all configurations
COPY tests/ ./tests/

# Frontend code (needed for some tests)
COPY frontend/ ./frontend/

# Server code (needed for some tests)
COPY server/ ./server/

# Shared code (needed for tests)
COPY shared/ ./shared/

# Scripts (needed for validation scripts)
COPY scripts/ ./scripts/

# Config (needed for scripts that import logger and other config)
COPY config/ ./config/

# Keep the container running
CMD ["tail", "-f", "/dev/null"]