#!/bin/bash

echo "Setting up backend..."

# Create .env file from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please update it with your configuration."
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies with retry logic (for VPN issues)
echo "Installing dependencies..."
while true; do
    echo "Attempting to install dependencies..."
    pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        echo "✓ Dependencies installed successfully!"
        break
    else
        echo "Installation failed. Retrying in 1 second..."
        sleep 1
    fi
done

echo ""
echo "✓ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running: docker-compose up -d"
echo "2. Update .env file with your database credentials if needed"
echo "3. Start the backend server:"
echo "   source .venv/bin/activate"
echo "   python3 -m app.main"
