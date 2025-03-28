FROM mcr.microsoft.com/playwright:v1.51.0-noble

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copy all files
COPY . .

# Set the default command to run tests
CMD ["pnpm", "test"]