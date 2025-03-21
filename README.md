# Lessons Marketplace

Unlock your potential with Lessons Marketplace – the go-to platform for parents and students to connect with top 1:1 instructors and master their passions!

## Prerequisites

### Docker Installation

To use the Docker-based development environment, you need to install Docker first:

#### For macOS:

**Option 1: Install Docker Desktop (Official Method)**
1. Download Docker Desktop from [Docker's official website](https://www.docker.com/products/docker-desktop/)
2. Open the downloaded `.dmg` file
3. Drag the Docker icon to your Applications folder
4. Open Docker from your Applications folder
5. Accept the terms and conditions

**Option 2: Install using Homebrew (Recommended for developers)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop from Applications folder
```

#### For Windows:
1. Download Docker Desktop from [Docker's official website](https://www.docker.com/products/docker-desktop/)
2. Run the installer and follow the instructions
3. Make sure WSL 2 is enabled if prompted

#### For Linux:
```bash
# Install Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Database Setup

### Option 1: Install PostgreSQL locally

1. **Install PostgreSQL:**
   - Mac: 
     ```bash
     brew install postgresql@15
     brew services start postgresql@15
     ```
   - Windows: Download and install from [PostgreSQL website](https://www.postgresql.org/download/windows/)
   - Linux:
     ```bash
     sudo apt update
     sudo apt install postgresql postgresql-contrib
     ```

2. **Create database:**
   - macOS (Homebrew installation):
     ```bash
     # Connect with your system username (no need for -U flag)
     psql postgres
     CREATE DATABASE arts_marketplace;
     \q
     ```
   - Windows/Linux (standard installation):
     ```bash
     psql -U postgres
     CREATE DATABASE arts_marketplace;
     \q
     ```

3. **Note for macOS Homebrew users:**
   - Homebrew PostgreSQL installations use your system username as the default PostgreSQL user
   - Make sure to update your .env file to use your username in the DB_USER variable
   - Example: `DB_USER=yourusername` instead of `DB_USER=postgres`

### Option 2: Use Docker

1. **Start PostgreSQL with Docker:**
   ```bash
   docker run --name arts-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=arts_marketplace -p 5432:5432 -d postgres:15
   ```
   
   With Docker, use these database environment variables: 
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=arts_marketplace
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_SSL=false
   ```

### Option 3: Use Docker Compose (Recommended)

This project includes a Docker Compose configuration (compose.yaml) for local development:

1. **Start all services (database, backend, frontend):**
   ```bash
   docker compose up -d
   ```

2. **Access the services:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Database: PostgreSQL on localhost:5432

3. **Stop all services:**
   ```bash
   docker compose down
   ```

4. **View logs:**
   ```bash
   docker compose logs -f
   ```

## Project Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd arts-marketplace
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   - Copy the `.env.example` file to `.env` (if not already done)
   - Update the database connection URL if needed

4. **Apply database migrations:**
   ```bash
   pnpm prisma:migrate
   ```

5. **Seed the database:**
   ```bash
   pnpm prisma:seed
   ```

6. **Start development server:**
   ```bash
   pnpm dev:full
   ```

## Available Scripts

- `pnpm dev` - Start frontend development server
- `pnpm dev:server` - Start backend development server
- `pnpm dev:full` - Start both frontend and backend servers
- `pnpm build` - Build frontend
- `pnpm build:server` - Build backend
- `pnpm build:full` - Build entire application
- `pnpm start` - Start production server
- `pnpm lint` - Run linter
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio to manage database
- `pnpm prisma:seed` - Seed the database with initial data
- `pnpm db:reset` - Reset the database (drop and recreate all tables)

## Deployment

This project uses a modern deployment approach with separate frontend and backend deployments.

### Deploying to Fly.io

To deploy the application to Fly.io:

```bash
# Simple deployment without database setup
pnpm deploy:fly

# Deployment with database setup (password setup, connection, etc.)
pnpm deploy:fly:with-db
```

The `deploy:fly` command will deploy both the API and frontend applications without attempting to modify the database configuration, which is useful for routine deployments where database settings remain unchanged.

Use the `deploy:fly:with-db` flag when you need to:
- Set up the database for the first time
- Update database credentials
- Recreate the DATABASE_URL secret
- Reconnect to the database if connection issues occur

### Deployment Architecture

- **Frontend**: Static React app served by Nginx
- **Backend**: Node.js API server
- **Database**: PostgreSQL on Fly.io

## Database Schema

The application uses PostgreSQL with Prisma ORM. The main entities are:

- **User**: Stores user information, can be artists or regular users
- **Product**: Artwork listings with details
- **Category**: Product categories
- **Order**: User orders
- **OrderItem**: Individual items in an order

## Development

To explore the database visually:

```bash
pnpm prisma:studio
```

To create a new migration after schema changes:

```bash
pnpm prisma:migrate
```

## Build Process and Best Practices

This project follows a monorepo structure with three main components:

1. **Frontend**: React application built with Vite
2. **Server**: Node.js/Express backend
3. **Shared**: Common code used by both frontend and server

### NPM Scripts

The project uses a streamlined set of npm scripts for development and building:

```bash
# Development
npm run dev            # Start frontend development server
npm run dev:server     # Start backend development server with hot reload
npm run dev:full       # Start both frontend and backend in development mode

# Building
npm run build:shared   # Build shared code (automatically generates Prisma client first)
npm run build:frontend # Build frontend application
npm run build:server   # Build server (includes building shared code first)
npm run build          # Build everything (frontend and server, which includes shared)
npm run clean          # Remove all build artifacts (automatically runs before build)

# Running
npm run start          # Start the production server
npm run start:frontend # Start the frontend in preview mode
```

#### Script Hooks

The project uses npm/pnpm script hooks for automatic sequencing:

- `prebuild:shared`: Automatically runs before `build:shared` to generate the Prisma client
- `prebuild`: Automatically runs before `build` to clean the dist directory

These hooks ensure that dependencies are generated and old artifacts are cleaned up before building.

### Fresh Checkout Workflow

For a fresh checkout of the project, you only need two commands:

```bash
# Install dependencies
pnpm install

# Build everything (includes Prisma client generation)
pnpm build
```

This will automatically:
1. Install all dependencies
2. Generate the Prisma client
3. Clean any previous build artifacts
4. Build all components (shared, frontend, server)

### Build Output Directories

When you run `pnpm build`, all build artifacts are placed in a centralized `dist/` directory:

1. `dist/frontend` - Contains the built frontend application (compiled and bundled by Vite)
2. `dist/server` - Contains the compiled server TypeScript code
3. `dist/shared` - Contains the compiled shared TypeScript code

This structure keeps build artifacts separate from source code, making the codebase cleaner and easier to navigate. The centralized `dist/` directory can be easily cleaned with `pnpm run clean`.

### Docker Build Process

The project uses a streamlined multi-stage Dockerfile with explicit build steps:

1. **Build Stage**:
   - Installs dependencies with `pnpm install`
   - Explicitly cleans any previous build artifacts with `pnpm clean`
   - Generates the Prisma client with `pnpm prisma:generate`
   - Builds frontend and server components with explicit build commands
   - Creates all build artifacts in the `/app/dist` directory

2. **Frontend Production Stage**:
   - Uses Nginx as the base image
   - Copies only the built frontend assets from the build stage
   - Configures Nginx to serve the frontend application

3. **Server Production Stage**:
   - Uses a minimal Node.js image
   - Installs only production dependencies
   - Copies only the necessary built files and runtime assets

This approach makes the build process explicit and predictable, resulting in optimized production images that contain only what's needed to run each component.

To build and run with Docker:

```bash
# Build both frontend and server
docker build -t lessons-marketplace .

# Run frontend only
docker run -p 5173:80 --target frontend lessons-marketplace

# Run server only
docker run -p 3000:3000 --target server lessons-marketplace
```

Or use Docker Compose to run the complete stack:

```bash
docker-compose up
```

### Best Practices

1. **Dependency Management**: All dependencies are in the root package.json for simplicity
2. **Build Order**: Always build shared code first, then server and frontend
3. **Docker Optimization**: 
   - Uses multi-stage builds to keep production images small
   - Copies package.json files first for better layer caching
   - Installs only production dependencies in final images
4. **Development Workflow**: Use the dev scripts for local development and docker-compose for a complete environment

## End-to-End Testing

### Running Tests

The project uses Playwright for end-to-end testing. Before running tests, ensure:

1. Your database is seeded with test data: `pnpm prisma:seed`
2. The application is running: `pnpm dev:full`

Run tests with one of these commands:

```bash
# Run all E2E tests with console output
pnpm test:e2e

# Run tests and generate an HTML report
pnpm test:e2e:report
```

### Screenshots

All test screenshots are saved in the `tests/screenshots` directory and are excluded from Git. 

Playwright is configured to automatically take screenshots on test failures. Tests also take explicit screenshots at key points for debugging purposes.

## Docker Development Environment

You can run the application using Docker with the following npm scripts:

```bash
# Start all Docker containers in detached mode
npm run docker:up

# Stop all Docker containers
npm run docker:down

# Seed the database in Docker
npm run docker:seed

# View Docker logs
npm run docker:logs

# Run end-to-end tests in Docker environment
npm run docker:test

# Run end-to-end tests with interactive prompt to keep containers running
npm run docker:test:interactive

# Build Docker images
npm run docker:build

# Rebuild Docker images without cache
npm run docker:rebuild
```

These commands replace the need for direct Docker commands or shell scripts.
