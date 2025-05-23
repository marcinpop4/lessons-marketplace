# Lessons Marketplace

This project is a platform for connecting students and parents with 1:1 instructors.

## Development Setup

Follow these steps to set up your local development environment.

### Prerequisites

1. **Node.js**: Install Node.js version 20 or later:
   ```bash
   # Using Homebrew on macOS
   brew install node@20
   
   # Or download directly from https://nodejs.org/
   ```

2. **pnpm**: Install pnpm version 10.3.0 or later:
   ```bash
   # Using npm
   npm install -g pnpm@10.3.0
   
   # Or using Homebrew on macOS
   brew install pnpm
   ```

3. **PostgreSQL**: Version 15. Install using Homebrew:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

4. **Environment Setup**: Create your development environment file:
   ```bash
   # Copy the example environment file
   cp env/.env.example env/.env.development
   ```

### Installation and Setup

Run the following command to set up everything automatically:

```bash
NODE_ENV=development pnpm validate:full
```

This script will:
1. Clean and install dependencies
2. Create and set up the database
3. Run migrations
4. Generate Prisma client
5. Seed the database
6. Run diagnostics and tests

If `validate:full` succeeds, your development environment is ready!

### Starting the Development Servers

To start the development servers:

```bash
NODE_ENV=development pnpm dev:full
```

This will start:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## Running with Docker

You can run the application and tests within a Docker environment.

1. **Deploy Locally**: Builds images and starts containers for frontend, server, and database.
   ```bash
   NODE_ENV=test pnpm docker:deploy
   ```

2. **Run Tests in Docker**: Builds a test image and runs tests against the Dockerized application.
   ```bash
   NODE_ENV=test pnpm docker:test
   ```
   This runs the test suite defined in `docker/docker-compose.yml`.

Refer to `package.json` and `docker/docker-compose.yml` for details on the specific environment variables used in these Docker commands.

## Production Build

To deploy the application in production:

NODE_ENV=production FLY_API_TOKEN="your-fly-api-token" pnpm docker:deploy:fly

## CI/CD Pipelines

The project uses GitHub Actions for Continuous Integration and Continuous Deployment.

### 1. CI Pipeline (`.github/workflows/ci-cd.yml`)

-   **Name**: `GitHub CI/CD Pipeline`
-   **Triggers**: Runs on pushes and pull requests to the `main` branch.
-   **Jobs**:
    -   `test`:
        -   Runs on `ubuntu-latest`.
        -   Sets `NODE_ENV=test`.
        -   Checks out code, sets up Node.js and pnpm.
        -   Installs dependencies (`pnpm install --frozen-lockfile`).
        -   Sets up Docker Buildx.
        -   Cleans Docker environment (`pnpm docker:clean`).
        -   Builds and deploys Docker containers (`pnpm docker:deploy:rebuild`).
        -   Runs debug scripts (`scripts/docker-debug.ts`) and uploads logs.
        -   Runs tests within Docker (`pnpm docker:test`).
        -   Uploads test execution logs, Playwright reports, results, screenshots, and traces as artifacts.

### 2. Production Deployment Pipeline (`.github/workflows/production-deploy.yml`)

-   **Name**: `Production Deployment`
-   **Triggers**:
    -   Manual dispatch (`workflow_dispatch`).
    -   Completion of the `GitHub CI/CD Pipeline` workflow on the `main` branch (`workflow_run`), only if the CI pipeline succeeded.
-   **Jobs**:
    -   `deploy`:
        -   Runs on `ubuntu-latest`.
        -   Requires the `production` environment (allows for environment secrets like `FLY_API_TOKEN`).
        -   Sets `NODE_ENV=production`.
        -   Checks out code, sets up Node.js and pnpm.
        -   Installs dependencies (`pnpm install --frozen-lockfile`).
        -   Deploys the application to Fly.io using `pnpm docker:deploy:fly`.
