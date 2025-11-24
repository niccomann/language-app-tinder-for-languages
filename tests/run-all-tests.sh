#!/bin/bash

# Run All E2E Tests
# This script runs all working Playwright tests in sequence

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (parent of tests/)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

echo ""
echo "🧪 Running All E2E Tests"
echo "════════════════════════════════════════"
echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Check if services are running
echo "🔍 Checking if services are running..."
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Frontend not running on port 5173"
    echo "   Please start: cd frontend && npm run dev"
    exit 1
fi

if ! curl -s http://localhost:8000/docs > /dev/null; then
    echo "❌ Backend not running on port 8000"
    echo "   Please start: cd backend && python -m app.main"
    exit 1
fi

echo "✅ Services are running"
echo ""

# Test 1: Quick Check
echo "════════════════════════════════════════"
echo "Test 1/3: Quick Check ⚡"
echo "════════════════════════════════════════"
node tests/test-quick-check.js
if [ $? -ne 0 ]; then
    echo "❌ Quick check failed!"
    exit 1
fi
echo ""

# Test 2: Video Reel E2E
echo "════════════════════════════════════════"
echo "Test 2/3: Video Reel E2E 🎬"
echo "════════════════════════════════════════"
node tests/test-video-reel-e2e.js
if [ $? -ne 0 ]; then
    echo "❌ Video reel E2E test failed!"
    exit 1
fi
echo ""

# Test 3: Video Playback
echo "════════════════════════════════════════"
echo "Test 3/3: Video Playback 🎥"
echo "════════════════════════════════════════"
node tests/test-video-playback.js
if [ $? -ne 0 ]; then
    echo "❌ Video playback test failed!"
    exit 1
fi
echo ""

# Summary
echo "════════════════════════════════════════"
echo "✅ ALL TESTS PASSED!"
echo "════════════════════════════════════════"
echo ""
echo "📸 Screenshots saved:"
echo "   - quick-check.png"
echo "   - test-video-1.png"
echo "   - test-video-2.png"
echo "   - test-final.png"
echo "   - test-playback-1.png"
echo "   - test-playback-2.png"
echo ""
