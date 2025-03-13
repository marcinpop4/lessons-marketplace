# Lessons Marketplace

Unlock your potential with Lessons Marketplace – the go-to platform for parents and students to connect with top 1:1 instructors and master their passions!

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
   - Make sure to update your .env file to use your username instead of 'postgres'
   - Example: `DATABASE_URL="postgresql://yourusername@localhost:5432/arts_marketplace?schema=public"`

### Option 2: Use Docker

1. **Start PostgreSQL with Docker:**
   ```bash
   docker run --name arts-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=arts_marketplace -p 5432:5432 -d postgres:15
   ```
   
   With Docker, keep the default connection string: 
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arts_marketplace?schema=public"
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
