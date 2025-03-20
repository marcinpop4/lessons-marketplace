#!/bin/bash
set -e

# This is now just a wrapper around the TypeScript implementation
echo "Running database migrations using TypeScript implementation..."

# Run the TypeScript implementation using ts-node
npx ts-node server/run-migration.ts 