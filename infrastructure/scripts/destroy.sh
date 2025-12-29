#!/bin/bash
# =============================================================================
# DESTROY INFRASTRUCTURE SCRIPT - Multi-Region Support
# =============================================================================
# Usage: ./destroy.sh [eu|sa]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_REGION="${1:-eu}"

case "$DEPLOY_REGION" in
    eu)
        AWS_REGION="eu-central-1"
        CLUSTER_NAME="tinder-languages-cluster"
        TF_DIR="$INFRA_DIR/terraform"
        NLB_NAME="tinder-frontend-nlb"
        TG_NAME="tinder-frontend-tg"
        ;;
    sa)
        AWS_REGION="sa-east-1"
        CLUSTER_NAME="tinder-languages-cluster-sa"
        TF_DIR="$INFRA_DIR/terraform/regions/sa-east-1"
        NLB_NAME="tinder-frontend-nlb-sa"
        TG_NAME="tinder-frontend-tg-sa"
        ;;
    *)
        echo "Usage: $0 [eu|sa]"
        exit 1
        ;;
esac

echo -e "${RED}============================================${NC}"
echo -e "${RED}  WARNING: Destroying $DEPLOY_REGION ($AWS_REGION)${NC}"
echo -e "${RED}============================================${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Load secrets
export CLUSTER_NAME
export AWS_REGION
source "$SCRIPT_DIR/setup-secrets.sh"

# Configure kubectl
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION" 2>/dev/null || true

# Delete Kubernetes resources first
echo -e "${YELLOW}Deleting Kubernetes resources...${NC}"
kubectl delete namespace tinder-languages --ignore-not-found=true 2>/dev/null || true

# Delete NLB and target group
echo -e "${YELLOW}Cleaning up NLB...${NC}"
TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$AWS_REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
NLB_ARN=$(aws elbv2 describe-load-balancers --names "$NLB_NAME" --region "$AWS_REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "")

if [ -n "$NLB_ARN" ] && [ "$NLB_ARN" != "None" ]; then
    aws elbv2 delete-load-balancer --load-balancer-arn "$NLB_ARN" --region "$AWS_REGION" 2>/dev/null || true
    sleep 10
fi
if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
    aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$AWS_REGION" 2>/dev/null || true
fi

# Destroy Terraform
echo -e "${YELLOW}Destroying Terraform infrastructure...${NC}"
cd "$TF_DIR"
terraform destroy -auto-approve

echo -e "${GREEN}All $DEPLOY_REGION resources destroyed.${NC}"
