#!/bin/bash
# Run E2E tests against LOCAL development environment
# Requires: localhost:5173 (frontend) and localhost:8500 (backend) running

echo "🧪 Running E2E tests against LOCAL (localhost:5173)"
echo ""

TEST_ENV=local node "$(dirname "$0")/e2e/web/test-deployed.js"
