#!/bin/bash

echo "🎮 Starting Tinder for Languages..."

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start backend
echo "📦 Starting backend..."
cd "$PROJECT_ROOT/backend"

if [ ! -d ".venv" ]; then
    echo "❌ Backend virtual environment not found. Please run ./backend/setup.sh first"
    exit 1
fi

source .venv/bin/activate
python3 -m app.main &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) at http://localhost:8500"

# Start frontend
echo "📦 Starting frontend..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo "❌ Frontend dependencies not found. Please run 'npm install' in frontend/ first"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🚀 Both services are running!"
echo "   Backend API: http://localhost:8500"
echo "   Frontend:    http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Handle Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both processes
wait
