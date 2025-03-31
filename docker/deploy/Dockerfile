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
export TS_NODE_PROJECT="/app/docker/deploy/tsconfig.ci.json"\n\
which flyctl\n\
# Run TypeScript check first\n\
echo "Running TypeScript check..."\n\
pnpm tsc --project /app/docker/deploy/tsconfig.ci.json --noEmit\n\
if [ $? -ne 0 ]; then\n\
  echo "TypeScript check failed. Please fix the errors before deploying."\n\
  exit 1\n\
fi\n\
# If TypeScript check passes, proceed with deployment\n\
pnpm fly:deploy:server && pnpm fly:deploy:frontend\n\
' > /app/deploy.sh && chmod +x /app/deploy.sh

# Set environment variables
ENV ENV_TYPE=prod
ENV TS_NODE_PROJECT=/app/docker/deploy/tsconfig.ci.json

# The command will use our deploy script
CMD ["/app/deploy.sh"]