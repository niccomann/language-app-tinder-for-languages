#!/bin/bash
# Run E2E tests against SOUTH AMERICA PRODUCTION (São Paulo)
# URL: TBD (deploy first with: ./infrastructure/scripts/deploy.sh sa all)

echo "🧪 Running E2E tests against SA PRODUCTION (São Paulo)"
echo ""

TEST_ENV=sa node "$(dirname "$0")/e2e/web/test-deployed.js"
