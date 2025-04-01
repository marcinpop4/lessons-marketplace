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
   - Make sure to update your .env file to use your username in the POSTGRES_USER variable
   - Example: `POSTGRES_USER=yourusername` instead of `POSTGRES_USER=postgres`

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
   POSTGRES_DB=arts_marketplace
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
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

### Deploying to Fly.io

This project is configured for easy deployment to Fly.io using a unified Docker build approach. The same Dockerfile used for local development is used for production deployment, with environment variables controlling the behavior.

#### Prerequisites

1. Install the Fly.io CLI:
   ```bash
   # For macOS/Linux
   curl -L https://fly.io/install.sh | sh
   
   # For Windows (in PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Login to Fly.io:
   ```bash
   flyctl auth login
   ```

3. Ensure you have a `.env.production` file with your production environment variables.

#### Deployment Steps

1. Deploy both frontend and backend:
   ```bash
   pnpm deploy:fly
   ```

2. Deploy with a new Postgres database (first time only):
   ```bash
   pnpm deploy:fly:with-db
   ```

#### Checking Deployment Status

1. Check logs:
   ```bash
   # For backend
   flyctl logs -a lessons-marketplace-server
   
   # For frontend
   flyctl logs -a lessons-marketplace-frontend
   ```

2. Open the deployed application:
   ```bash
   flyctl open -a lessons-marketplace-frontend
   ```

#### Configuration

The deployment uses the following structure:
- The main `Dockerfile` is used for both local development and production
- Environment variables control differences between environments
- The server automatically detects if it's running in Fly.io and adapts accordingly
- The frontend configuration is generated at runtime to connect to the correct API endpoint

## Database Schema

The application uses PostgreSQL with Prisma ORM. The main entities are:

- **User**: Stores user information, can be artists or regular users
- **Product**: Artwork listings with details
- **Category**: Product categories
- **Order**: User orders
- **OrderItem**: Individual items in an order

## Development

### Environment Configuration

The project includes a powerful environment configuration script that manages different environment settings:

```bash
# Generate development environment
pnpm env:dev

# Generate Docker environment
pnpm env:docker

# Generate production environment
pnpm env:prod

# Generate environment with custom output directory
pnpm env:docker ./custom-output
```

You can also specify a custom output directory with any of the environment commands:

```bash
# Format: pnpm env:<environment> [output-directory]
pnpm env:dev ./custom-path
pnpm env:docker /some/other/path
pnpm env:prod /tmp/prod-env
```

The script handles:
- Loading environment variables from base and specific environment files
- Generating .env files for local development
- Creating Docker environment configurations
- Building Fly.io deployment files

### Database Exploration

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

## TypeScript Path Alias Troubleshooting

This project uses TypeScript path aliases (e.g., `@shared/*`, `@frontend/*`) to make imports cleaner and more maintainable. If you encounter issues with path aliases not being recognized by your editor, try the following steps:

### Fix TypeScript Configuration

We've provided a script to fix TypeScript configuration files and ensure path aliases work correctly:

```bash
# Fix TypeScript configuration files and rebuild references
pnpm fix:typescript
```

### Editor Setup

For VS Code users:
1. Restart the TypeScript server: Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux) and select "TypeScript: Restart TS Server"
2. Make sure you have the recommended extensions installed (a notification should appear)
3. Open the project using the workspace file: `.vscode/typescript.code-workspace`

### Path Alias Diagnostic

To diagnose path alias issues:

```bash
# Run the TypeScript diagnostics tool
pnpm diagnose:ts
```

### Last Resort Workaround

If you still encounter issues in your editor while working on the project, you can temporarily use relative imports:

```typescript
// Instead of
import { LessonType } from '@shared/models/LessonType';

// You can use a relative path temporarily
import { LessonType } from '../../../../shared/models/LessonType';
```

Note that the build process will still work with path aliases, so this is only needed if your editor is showing false errors.
