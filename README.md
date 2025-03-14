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

### Backend API Deployment

The backend API is deployed to Fly.io:

1. **Configure environment variables:**
   - Update `.env.production` with your production database URL and other settings
   - Set sensitive values as secrets: `fly secrets set JWT_SECRET=your-secret-value`

2. **Deploy the backend:**
   ```bash
   ./server/deploy.sh
   ```

3. **Access the deployed API:**
   - API URL: https://lessons-marketplace-dawn-cherry-4121.fly.dev
   - Health check: https://lessons-marketplace-dawn-cherry-4121.fly.dev/api/health

### Frontend Deployment

The frontend is deployed separately to Fly.io:

1. **Configure environment variables:**
   - Update `frontend/.env.production` with your API URL

2. **Deploy the frontend:**
   ```bash
   ./frontend/deploy.sh
   ```

3. **Access the deployed frontend:**
   - Frontend URL: https://lessons-marketplace-frontend.fly.dev

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
