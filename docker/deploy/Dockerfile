FROM node:20-slim

WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.3.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy the rest of the application
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install flyctl
RUN curl -L https://fly.io/install.sh | sh

# Create a script to run the deployment with the correct path
RUN echo '#!/bin/bash\n\
export PATH="$PATH:/root/.fly/bin"\n\
which flyctl\n\
pnpm fly:deploy:server && pnpm fly:deploy:frontend\n\
' > /app/deploy.sh && chmod +x /app/deploy.sh

# Set environment variables
ENV ENV_TYPE=prod

# The command will use our deploy script
CMD ["/app/deploy.sh"]