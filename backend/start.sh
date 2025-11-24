#!/bin/bash

echo "Starting backend server..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Please run ./setup.sh first"
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Start the server
echo "Backend server starting at http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
python3 -m app.main
