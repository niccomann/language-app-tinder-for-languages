#!/bin/bash
# Run E2E tests against EU PRODUCTION (Frankfurt)
# URL: http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com

echo "🧪 Running E2E tests against EU PRODUCTION (Frankfurt)"
echo ""

TEST_ENV=eu node "$(dirname "$0")/e2e/web/test-deployed.js"
