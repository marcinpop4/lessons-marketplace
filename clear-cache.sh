#!/bin/bash

# Print message with color
print_message() {
  GREEN='\033[0;32m'
  NC='\033[0m' # No Color
  echo -e "${GREEN}$1${NC}"
}

print_message "Clearing Vite cache..."
rm -rf node_modules/.vite

print_message "Clearing frontend build artifacts..."
rm -rf dist

# Add cache-busting version to components
print_message "Adding cache-busting version to components..."
VERSION=$(date +%Y%m%d%H%M%S)

# Force a very obvious change in the main TSX files
for file in $(find ./frontend -name "*.tsx"); do
  # Avoid git conflicts by only adding the comment if it doesn't exist
  if ! grep -q "// CACHE-BUSTER" "$file"; then
    # Add a cache-busting comment at the top of the file
    sed -i '' "1s/^/\\/\\/ CACHE-BUSTER: $VERSION\\n/" "$file"
  else
    # Update the existing cache-buster comment
    sed -i '' "s/\\/\\/ CACHE-BUSTER: .*/\\/\\/ CACHE-BUSTER: $VERSION/" "$file"
  fi
done

print_message "Done! Cache cleared successfully."
print_message "To start the development server with a clean cache, run:"
print_message "pnpm run dev:full:clear-cache"
print_message ""
print_message "BROWSER INSTRUCTIONS:"
print_message "1. Open Chrome DevTools (F12 or Ctrl+Shift+I)"
print_message "2. Right-click the refresh button and select 'Empty Cache and Hard Reload'"
print_message "3. Or go to Application > Storage > Clear site data" 