import { execa } from 'execa';
import { config } from 'dotenv';
import path from 'path';

async function main() {
  // Load environment variables
  const envPath = path.join(process.cwd(), 'env', `.env.${process.env.NODE_ENV || 'development'}`);
  config({ path: envPath });

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  // Extract database name and user from DATABASE_URL
  // Format: postgresql://user:password@host:port/database
  const dbName = DATABASE_URL.split('/').pop()?.split('?')[0];
  const dbUser = DATABASE_URL.split('://')[1]?.split(':')[0];
  const dbPassword = DATABASE_URL.split('://')[1]?.split(':')[1]?.split('@')[0];

  if (!dbName || !dbUser || !dbPassword) {
    throw new Error('Could not extract database name, user, or password from DATABASE_URL');
  }

  try {
    // Terminate existing connections
    console.log('Terminating existing connections...');
    await execa('psql', [
      '-d', 'postgres',
      '-c', `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();`
    ]);

    // Drop database if exists
    console.log(`Dropping database: ${dbName}...`);
    await execa('psql', [
      '-d', 'postgres',
      '-c', `DROP DATABASE IF EXISTS ${dbName};`
    ]);

    // Create or update user
    console.log(`Creating/updating user: ${dbUser}...`);
    await execa('psql', [
      '-d', 'postgres',
      '-c', `DO
      $do$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${dbUser}') THEN
          CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';
        ELSE
          ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}';
        END IF;
      END
      $do$;`
    ]);

    // Create database
    console.log(`Creating database: ${dbName}...`);
    await execa('psql', [
      '-d', 'postgres',
      '-c', `CREATE DATABASE ${dbName};`
    ]);

    // Grant database privileges
    console.log(`Granting database privileges to user: ${dbUser}...`);
    await execa('psql', [
      '-d', 'postgres',
      '-c', `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};`
    ]);

    // Grant schema privileges
    console.log(`Granting schema privileges to user: ${dbUser}...`);
    await execa('psql', [
      '-d', dbName,
      '-c', `GRANT ALL ON SCHEMA public TO ${dbUser};`
    ]);

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 