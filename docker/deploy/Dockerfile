FROM node:20-slim

WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.3.0 --activate

# Copy essential files for building and deploying
COPY package.json pnpm-lock.yaml ./
COPY scripts/ ./scripts/
COPY env/ ./env/
COPY docker/ ./docker/
COPY server/ ./server/
COPY frontend/ ./frontend/
COPY shared/ ./shared/
COPY tsconfig.json ./
COPY config/ ./config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install flyctl
RUN curl -L https://fly.io/install.sh | sh
ENV PATH="/root/.fly/bin:${PATH}"

# Set environment variables
ENV NODE_ENV=production

CMD flyctl version && \
    node scripts/sync-fly-env.js server && \
    flyctl deploy --config docker/server/fly.toml --no-cache && \
    node scripts/sync-fly-env.js frontend && \
    flyctl deploy --config docker/frontend/fly.toml --no-cache