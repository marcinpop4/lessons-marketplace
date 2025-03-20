#!/bin/sh
set -e

# This is now just a wrapper around the TypeScript implementation
echo "Starting server using TypeScript implementation..."

# Run the TypeScript implementation using ts-node
npx ts-node server/entrypoint.ts 