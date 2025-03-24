# Docker Deployment for Lessons Marketplace

This directory contains all the Docker-related files and configurations for deploying the Lessons Marketplace application.

## Directory Structure

- `docker-compose.yml` - The main Docker Compose configuration file
- `server/` - Docker configuration for the server
- `frontend/` - Docker configuration for the frontend
- `scripts/` - Scripts for building, deploying, and cleaning up Docker resources

## Quick Start

To deploy the application using Docker, run the following commands:

```bash
# Build the application
npm run docker:build

# Deploy the application
npm run docker:deploy
```

For production deployment:

```bash
# Build the application for production
npm run docker:build:production

# Deploy the application for production
npm run docker:deploy:production
```

## Available Commands

All Docker-related commands are available in the project's `package.json` file:

- `docker:build` - Build the application for Docker
- `docker:build:production` - Build the application for Docker in production mode
- `docker:deploy` - Deploy the application to Docker
- `docker:deploy:production` - Deploy the application to Docker in production mode
- `docker:clean` - Clean up Docker resources
- `docker:up` - Start the Docker containers
- `docker:down` - Stop the Docker containers
- `docker:logs` - View the Docker container logs
- `docker:ps` - View the status of the Docker containers
- `docker:seed` - Seed the database with test data

## Environment Variables

The Docker deployment uses environment variables from `.env` for development and `.env.production` for production. Make sure these files exist and contain the required variables before deploying.

Required environment variables:

- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `PORT` - Server port
- `JWT_SECRET` - JWT secret key

## Architecture

The Docker deployment consists of the following services:

1. **Database** - PostgreSQL database
2. **Server** - Node.js Express server
3. **Frontend** - React frontend served by Nginx
4. **RabbitMQ** - Message broker for async communication

## Volumes

The deployment uses the following Docker volumes:

- `postgres_data` - Persistent storage for the PostgreSQL database

## Networks

All services are connected through a shared Docker network created by Docker Compose.

## Custom Configuration

You can customize the Docker deployment by modifying the `docker-compose.yml` file and the Dockerfiles in the `server/` and `frontend/` directories.

## Fly.io Deployment

The application can also be deployed to fly.io. The fly.io deployment configuration is in the `fly-config/` directory, and the deployment scripts are in the `scripts/` directory.

### Quick Start - Fly.io Deployment

To deploy the application to fly.io, run the following commands:

```bash
# Build and deploy the application to fly.io
npm run fly:deploy
```

For production deployment:

```bash
# Build and deploy the application to fly.io in production mode
npm run fly:deploy:production
```

### Available Fly.io Commands

All fly.io-related commands are available in the project's `package.json` file:

- `fly:deploy` - Build and deploy the application to fly.io
- `fly:deploy:production` - Build and deploy the application to fly.io in production mode
- `fly:deploy:server` - Deploy only the server to fly.io
- `fly:deploy:frontend` - Deploy only the frontend to fly.io
- `fly:deploy:skip-build` - Deploy to fly.io without building the application
- `fly:deploy:skip-migrations` - Deploy to fly.io without running database migrations

### Fly.io Architecture

The fly.io deployment consists of the following services:

1. **Database** - PostgreSQL database hosted on fly.io
2. **Server** - Node.js Express server deployed to fly.io
3. **Frontend** - React frontend deployed to fly.io

### Environment Variables

The fly.io deployment uses environment variables from `.env.production`. Make sure this file exists and contains the required variables before deploying.

Required environment variables are the same as for the Docker deployment, but they need to be configured in fly.io through the deployment script:

- `DB_HOST` - Database host (usually something.internal on fly.io)
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password (must be set as a secret in production, not in .env.production)
- `JWT_SECRET` - JWT secret key (set as a secret)
- `FRONTEND_URL` - URL of the frontend service
- `VITE_API_BASE_URL` - URL of the backend API

For development deployments, the script will generate and set required secrets automatically.
For production deployments, you must manually set all secrets before running the deployment script:

```bash
# Set up the required secrets for the server
fly secrets set DB_PASSWORD=your-secure-password -a lessons-marketplace-server
fly secrets set JWT_SECRET=your-jwt-secret -a lessons-marketplace-server
fly secrets set JWT_EXPIRES_IN=1h -a lessons-marketplace-server
fly secrets set REFRESH_TOKEN_EXPIRES_IN=7d -a lessons-marketplace-server
fly secrets set FRONTEND_URL=https://lessons-marketplace-frontend.fly.dev -a lessons-marketplace-server

# Once all secrets are set, run the deployment
pnpm run fly:deploy:production
``` 