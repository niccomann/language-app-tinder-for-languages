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

# Clean up old screenshots
echo "🧹 Cleaning up old screenshots..."
rm -f "$PROJECT_ROOT"/*.png 2>/dev/null
echo "✅ Old screenshots removed"
echo ""

# Check if services are running
echo "🔍 Checking if services are running..."
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Frontend not running on port 5173"
    echo "   Please start: cd frontend && npm run dev"
    exit 1
fi

if ! curl -s http://localhost:8500/docs > /dev/null; then
    echo "❌ Backend not running on port 8500"
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
echo "Test 3/4: Video Playback 🎥"
echo "════════════════════════════════════════"
node tests/test-video-playback.js
if [ $? -ne 0 ]; then
    echo "❌ Video playback test failed!"
    exit 1
fi
echo ""

# Test 4: AI Video Selector
echo "════════════════════════════════════════"
echo "Test 4/7: AI Video Selector 🤖"
echo "════════════════════════════════════════"
node tests/test-ai-video-selector.js
if [ $? -ne 0 ]; then
    echo "❌ AI video selector test failed!"
    exit 1
fi
echo ""

# Test 5: Grammar Lab
echo "════════════════════════════════════════"
echo "Test 5/7: Grammar Lab 🧪"
echo "════════════════════════════════════════"
node tests/test-grammar-lab.js
if [ $? -ne 0 ]; then
    echo "❌ Grammar Lab test failed!"
    exit 1
fi
echo ""

# Test 6: Words Library
echo "════════════════════════════════════════"
echo "Test 6/7: Words Library 📚"
echo "════════════════════════════════════════"
node tests/test-words-library.js
if [ $? -ne 0 ]; then
    echo "❌ Words Library test failed!"
    exit 1
fi
echo ""

# Test 7: Flashcard Flow
echo "════════════════════════════════════════"
echo "Test 7/7: Flashcard Flow 🎴"
echo "════════════════════════════════════════"
node tests/test-flashcard-flow.js
if [ $? -ne 0 ]; then
    echo "❌ Flashcard flow test failed!"
    exit 1
fi
echo ""

# Summary
echo "════════════════════════════════════════"
echo "✅ ALL TESTS PASSED!"
echo "════════════════════════════════════════"
echo ""
echo "📸 Screenshots were saved during tests"
echo ""

# Clean up screenshots after tests
echo "🧹 Cleaning up test screenshots..."
sleep 2  # Give time to view the summary
rm -f "$PROJECT_ROOT"/*.png 2>/dev/null
echo "✅ Screenshots cleaned up"
echo ""
echo "💡 To test full AI video generation (5-10 min, costs money):"
echo "   node tests/test-ai-video-generation.js"
echo ""
