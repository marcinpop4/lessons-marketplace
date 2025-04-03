import { execSync } from 'child_process';
import dotenv from 'dotenv';
import pg from 'pg';
// Load environment variables
dotenv.config();
console.log('=== DATABASE CONNECTION TEST ===');
// Check database environment variables
console.log('\nDatabase Environment Variables:');
const dbVars = [
    'DATABASE_URL',
    'DB_HOST',
    'DB_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DB_SSL',
    'POSTGRES_HOST_AUTH_METHOD'
];
dbVars.forEach(varName => {
    const value = process.env[varName];
    if (varName.includes('PASSWORD') && value) {
        console.log(`${varName} = ******`);
    }
    else {
        console.log(`${varName} = ${value || 'not set'}`);
    }
});
// Try postgres client directly
async function testPgConnection() {
    console.log('\nAttempting direct PostgreSQL connection...');
    // Extract connection info from DATABASE_URL or use individual vars
    let config;
    if (process.env.DATABASE_URL) {
        console.log('Using DATABASE_URL for connection');
        config = {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };
    }
    else {
        console.log('Using individual connection parameters');
        config = {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.POSTGRES_DB,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };
    }
    const client = new pg.Pool(config);
    try {
        console.log('Connecting to PostgreSQL...');
        const result = await client.query('SELECT 1 as test');
        console.log('Database connection successful!');
        console.log('Query result:', result.rows);
    }
    catch (error) {
        console.error('Database connection failed:', error);
        // Try to ping the database server
        try {
            console.log(`\nAttempting to ping database host (${process.env.DB_HOST})...`);
            execSync(`ping -c 4 ${process.env.DB_HOST}`);
            console.log('Ping successful');
        }
        catch (pingError) {
            console.error('Ping failed:', pingError);
        }
        // Try to telnet to the database port
        try {
            console.log(`\nAttempting to check if port ${process.env.DB_PORT} is open...`);
            execSync(`nc -zv ${process.env.DB_HOST} ${process.env.DB_PORT}`);
            console.log('Port is open');
        }
        catch (portError) {
            console.error('Port check failed:', portError);
        }
    }
    finally {
        await client.end();
    }
}
// Execute the test
testPgConnection().catch(err => {
    console.error('Unhandled error in connection test:', err);
    process.exit(1);
});
