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