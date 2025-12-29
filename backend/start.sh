#!/bin/bash

echo "Starting backend server..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Please run ./setup.sh first"
    exit 1
fi

# Check if port 8500 is already in use
if lsof -Pi :8500 -sTCP:LISTEN -t >/dev/null ; then
    echo " Port 8500 is already in use!"
    echo "Kill the process? (y/n)"
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Start the server
echo "Backend server starting at http://localhost:8500"
echo "API Documentation: http://localhost:8500/docs"
echo ""
python3 -m app.main
