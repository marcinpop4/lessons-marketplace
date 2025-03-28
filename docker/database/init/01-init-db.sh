#!/bin/bash
set -e

# Create user if it doesn't exist
psql -v ON_ERROR_STOP=0 -U postgres <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'marcin') THEN
            CREATE USER marcin WITH PASSWORD 'password';
        END IF;
    END
    \$\$;
    
    GRANT ALL PRIVILEGES ON DATABASE lessons_marketplace TO marcin;
    ALTER USER marcin WITH SUPERUSER;
EOSQL

echo "Database initialization completed successfully." 