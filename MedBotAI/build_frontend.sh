#!/bin/bash

# Exit on error
set -e

echo "Building MedBot AI Frontend..."

# Navigate to the static directory
cd "$(dirname "$0")/static"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the React app
echo "Building React app..."
npm run build

# Create necessary directories if they don't exist
mkdir -p dist/static/img

# Copy favicon and logo if they don't exist
if [ ! -f dist/static/img/favicon.ico ]; then
  echo "Copying favicon..."
  cp public/favicon.ico dist/static/img/favicon.ico 2>/dev/null || echo "No favicon.ico found, skipping..."
fi

if [ ! -f dist/static/img/logo.png ]; then
  echo "Copying logo..."
  cp public/logo.png dist/static/img/logo.png 2>/dev/null || echo "No logo.png found, skipping..."
fi

echo "Frontend build complete!"
echo "You can now run the Flask application to serve the frontend." 