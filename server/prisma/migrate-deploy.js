/**
 * Database migration script for production deployments
 * This script runs the Prisma migrations in production environments
 *
 * TODO: Add proper TLS/SSL support when moving to production with real users
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Migration script logging functions (console acceptable for infrastructure scripts)
function logInfo(message, data = {}) {
    console.log(`[MIGRATION] ${message}`, Object.keys(data).length > 0 ? data : '');
}

function logError(message, error) {
    console.error(`[MIGRATION ERROR] ${message}`, error);
}

async function main() {
    logInfo('Starting database migration in production environment');
    // Additional logging to help debug database connection issues
    logInfo('Environment configuration', {
        environment: process.env.NODE_ENV,
        host: process.env.DB_HOST,
        database: process.env.POSTGRES_DB,
        flyIo: process.env.FLY_APP_NAME ? 'Yes' : 'No'
    });
    try {
        // Check all required environment variables
        const requiredEnvVars = ['POSTGRES_USER', 'DB_HOST', 'DB_PORT', 'POSTGRES_DB', 'POSTGRES_PASSWORD'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        // Use POSTGRES_PASSWORD from environment (should be set via Fly.io secrets)
        const dbPassword = process.env.POSTGRES_PASSWORD;
        if (!dbPassword) {
            throw new Error('POSTGRES_PASSWORD environment variable is not set');
        }
        // Construct database URL
        const databaseUrl = `postgresql://${process.env.POSTGRES_USER}:${dbPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.POSTGRES_DB}?sslmode=${process.env.DB_SSL === 'true' ? 'require' : 'disable'}`;
        // Log a masked version of the connection string for debugging
        const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
        logInfo('Database connection configured', {
            connectionString: maskedUrl,
            sslMode: process.env.DB_SSL === 'true' ? 'require' : 'disable'
        });
        // Run the migration with explicit schema path and environment variables
        logInfo('Executing migration command: npx prisma migrate deploy --schema=server/prisma/schema.prisma');
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy --schema=server/prisma/schema.prisma', {
            env: {
                ...process.env,
                DATABASE_URL: databaseUrl,
            },
        });
        if (stdout)
            logInfo('Migration output', { stdout });
        if (stderr)
            logError('Migration stderr', stderr);
        logInfo('Database migration completed successfully');
    }
    catch (error) {
        logError('Migration failed', error);
        process.exit(1);
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        logError('Unexpected error during migration', error);
        process.exit(1);
    });
