#!/bin/sh
set -e

# Run the appropriate script based on NODE_ENV
if [ "$NODE_ENV" = "development" ]; then
  npm run start:ts
else
  npm run start:js
fi 