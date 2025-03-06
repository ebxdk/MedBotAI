#!/bin/bash

# Exit on error
set -e

# Activate virtual environment if it exists
if [ -d "venv" ]; then
  echo "Activating virtual environment..."
  source venv/bin/activate
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if the frontend has been built
if [ ! -d "static/dist" ]; then
  echo "Frontend not built. Building now..."
  ./build_frontend.sh
fi

# Run the Flask application with Gunicorn
echo "Starting MedBot AI application in production mode..."
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 "main:app" 