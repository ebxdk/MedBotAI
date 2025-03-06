#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting MedBot AI setup..."

# Create and activate a fresh virtual environment
echo "Setting up a fresh virtual environment..."
rm -rf venv
python3 -m venv venv
. venv/bin/activate

# Clear any proxy settings that might be causing issues
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
unset PIP_USER

# Ensure pip doesn't use --user
export PYTHONUSERBASE=/dev/null
export PIP_USER=0

# Upgrade pip and install wheel
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

echo "Installing basic build tools..."
python3 -m pip install wheel setuptools

# Install all dependencies from requirements-minimal.txt
echo "Installing dependencies..."
python3 -m pip install -r requirements-minimal.txt

# Create a test file for the OpenAI package
echo "Verifying OpenAI installation..."
cat > test_openai.py << EOF
from openai import OpenAI
client = OpenAI()
print("OpenAI import successful!")
EOF

# Run the test file
python3 test_openai.py
rm test_openai.py

# Create .env file with dummy API key if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating sample .env file..."
  echo "OPENAI_API_KEY=sk-dummy-key-for-testing" > .env
fi

# Start the Flask application
echo "Starting MedBot AI application..."
python3 main.py