/**
 * Database migration script for production deployments
 * This script runs the Prisma migrations in production environments
 * 
 * TODO: Add proper TLS/SSL support when moving to production with real users
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  console.log('Starting database migration in production environment');

  // Additional logging to help debug database connection issues
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database Name: ${process.env.DB_NAME}`);
  console.log(`Fly.io Environment: ${process.env.FLY_APP_NAME ? 'Yes' : 'No'}`);

  try {
    // Check all required environment variables
    const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Use DB_PASSWORD from environment (should be set via Fly.io secrets)
    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword) {
      throw new Error('DB_PASSWORD environment variable is not set');
    }

    // Construct database URL
    const databaseUrl = `postgresql://${process.env.DB_USER}:${dbPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL === 'true' ? 'require' : 'disable'}`;

    // Log a masked version of the connection string for debugging
    const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`Using database connection: ${maskedUrl}`);
    console.log(`SSL mode: ${process.env.DB_SSL === 'true' ? 'require' : 'disable'}`);

    // Run the migration with explicit schema path and environment variables
    console.log('Executing migration command: npx prisma migrate deploy --schema=server/prisma/schema.prisma');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy --schema=server/prisma/schema.prisma', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  }); 