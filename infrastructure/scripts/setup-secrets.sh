#!/bin/bash
# =============================================================================
# SETUP SECRETS SCRIPT
# =============================================================================
# This script loads secrets from .env and configures AWS CLI and kubectl
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$INFRA_DIR/secrets"
ENV_FILE="$SECRETS_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Tinder for Languages - Secrets Setup ===${NC}"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: $ENV_FILE not found${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and fill in your values:${NC}"
    echo "  cp $SECRETS_DIR/.env.example $ENV_FILE"
    exit 1
fi

# Load environment variables
echo -e "${GREEN}Loading secrets from .env...${NC}"
set -a
source "$ENV_FILE"
set +a

# Validate required variables
REQUIRED_VARS=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_REGION" "AWS_ACCOUNT_ID")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}ERROR: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}All required secrets loaded successfully!${NC}"

# Export for child processes
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION="$AWS_REGION"

# Configure kubectl for EKS (supports multi-region)
echo -e "${GREEN}Configuring kubectl for EKS...${NC}"
CLUSTER_NAME="${CLUSTER_NAME:-tinder-languages-cluster}"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION" 2>/dev/null || true

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "You can now run deployment scripts."
