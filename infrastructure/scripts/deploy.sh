#!/bin/bash
# =============================================================================
# UNIFIED DEPLOYMENT SCRIPT - Multi-Region Support
# =============================================================================
# Deploys Tinder for Languages to AWS EKS (EU or South America)
# 
# Usage:
#   ./deploy.sh [region] [command]
#
# Regions:
#   eu  - Europe (eu-central-1, Frankfurt) - DEFAULT
#   sa  - South America (sa-east-1, São Paulo)
#
# Commands:
#   all       - Deploy everything from scratch
#   build     - Build and push Docker images only
#   k8s       - Deploy Kubernetes manifests only
#   status    - Show deployment status
#   terraform - Deploy infrastructure only
#   nlb       - Update NLB targets
#
# Examples:
#   ./deploy.sh eu all      - Full deploy to EU
#   ./deploy.sh sa build    - Build images for SA
#   ./deploy.sh status      - Status of EU (default)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$INFRA_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse region argument
REGION_ARG="${1:-eu}"
if [[ "$REGION_ARG" == "eu" || "$REGION_ARG" == "sa" ]]; then
    DEPLOY_REGION="$REGION_ARG"
    COMMAND="${2:-status}"
else
    DEPLOY_REGION="eu"
    COMMAND="${1:-status}"
fi

# Region-specific configuration
case "$DEPLOY_REGION" in
    eu)
        AWS_REGION="eu-central-1"
        CLUSTER_NAME="tinder-languages-cluster"
        ECR_SUFFIX=""
        TF_DIR="$INFRA_DIR/terraform"
        NLB_NAME="tinder-frontend-nlb"
        TG_NAME="tinder-frontend-tg"
        ;;
    sa)
        AWS_REGION="sa-east-1"
        CLUSTER_NAME="tinder-languages-cluster-sa"
        ECR_SUFFIX="-sa"
        TF_DIR="$INFRA_DIR/terraform/regions/sa-east-1"
        NLB_NAME="tinder-frontend-nlb-sa"
        TG_NAME="tinder-frontend-tg-sa"
        ;;
esac

NAMESPACE="tinder-languages"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-664111151564}"

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load secrets
load_secrets() {
    print_header "Loading Secrets"
    source "$SCRIPT_DIR/setup-secrets.sh"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing=0
    
    for cmd in aws kubectl docker terraform; do
        if command -v $cmd &> /dev/null; then
            print_step "$cmd: $(command -v $cmd)"
        else
            print_error "$cmd is not installed"
            missing=1
        fi
    done
    
    if [ $missing -eq 1 ]; then
        echo ""
        print_error "Please install missing prerequisites"
        exit 1
    fi
}

# Login to ECR
ecr_login() {
    print_header "Logging into ECR"
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
}

# Build and push Docker images
build_and_push() {
    print_header "Building and Pushing Docker Images ($DEPLOY_REGION)"
    
    local ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Backend
    print_step "Building backend..."
    docker build --platform linux/amd64 \
        -t "$ECR_REPO/tinder-languages-backend${ECR_SUFFIX}:latest" \
        "$PROJECT_DIR/backend"
    docker push "$ECR_REPO/tinder-languages-backend${ECR_SUFFIX}:latest"
    
    # Frontend
    print_step "Building frontend..."
    docker build --platform linux/amd64 \
        -t "$ECR_REPO/tinder-languages-frontend${ECR_SUFFIX}:latest" \
        "$PROJECT_DIR/frontend"
    docker push "$ECR_REPO/tinder-languages-frontend${ECR_SUFFIX}:latest"
}

# Deploy Terraform infrastructure
deploy_terraform() {
    print_header "Deploying Terraform Infrastructure ($DEPLOY_REGION)"
    
    cd "$TF_DIR"
    
    # Create tfvars from secrets
    cat > terraform.tfvars <<EOF
aws_access_key = "$AWS_ACCESS_KEY_ID"
aws_secret_key = "$AWS_SECRET_ACCESS_KEY"
EOF
    
    terraform init
    terraform apply -auto-approve
    
    cd "$SCRIPT_DIR"
}

# Configure kubectl
configure_kubectl() {
    print_header "Configuring kubectl"
    
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
    
    # Add access entry for current user
    local USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    aws eks create-access-entry --cluster-name "$CLUSTER_NAME" --principal-arn "$USER_ARN" --type STANDARD 2>/dev/null || true
    aws eks associate-access-policy --cluster-name "$CLUSTER_NAME" --principal-arn "$USER_ARN" \
        --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
        --access-scope type=cluster 2>/dev/null || true
}

# Deploy Kubernetes manifests
deploy_kubernetes() {
    print_header "Deploying to Kubernetes"
    
    # Determine K8s manifests directory based on region
    if [ "$DEPLOY_REGION" == "sa" ]; then
        K8S_DIR="$INFRA_DIR/k8s/regions/sa-east-1"
    else
        K8S_DIR="$INFRA_DIR/k8s"
    fi
    
    # Create namespace
    kubectl apply -f "$INFRA_DIR/k8s/namespace.yaml"
    
    # Create secrets from .env
    kubectl create secret generic app-secrets \
        --namespace "$NAMESPACE" \
        --from-literal=SECRET_KEY="${SECRET_KEY:-changeme}" \
        --from-literal=openai-api-key="${OPENAI_API_KEY:-}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy components (configmap first, then deployments)
    kubectl apply -f "$INFRA_DIR/k8s/frontend-configmap.yaml"
    kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
    kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"
    
    print_step "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=backend -n "$NAMESPACE" --timeout=300s 2>/dev/null || true
    kubectl wait --for=condition=ready pod -l app=frontend -n "$NAMESPACE" --timeout=300s 2>/dev/null || true
}

# Show status
show_status() {
    print_header "Deployment Status ($DEPLOY_REGION - $AWS_REGION)"
    
    echo -e "${GREEN}Pods:${NC}"
    kubectl get pods -n "$NAMESPACE" -o wide
    
    echo ""
    echo -e "${GREEN}Services:${NC}"
    kubectl get svc -n "$NAMESPACE"
    
    echo ""
    echo -e "${GREEN}NLB Status:${NC}"
    TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$AWS_REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
    if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
        aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$AWS_REGION" --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' --output table
    else
        echo "NLB not found"
    fi
}

# Update NLB targets with current pod IPs
update_nlb() {
    print_header "Updating NLB Targets ($DEPLOY_REGION)"
    
    # Get target group ARN
    TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$AWS_REGION" --query 'TargetGroups[0].TargetGroupArn' --output text)
    
    if [ -z "$TG_ARN" ] || [ "$TG_ARN" == "None" ]; then
        print_error "Target group $TG_NAME not found"
        exit 1
    fi
    
    # Get current targets
    OLD_IPS=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$AWS_REGION" --query 'TargetHealthDescriptions[*].Target.Id' --output text)
    
    # Get new frontend pod IPs
    NEW_IPS=$(kubectl get pods -n "$NAMESPACE" -l app=frontend -o jsonpath='{.items[*].status.podIP}')
    
    print_step "Old IPs: $OLD_IPS"
    print_step "New IPs: $NEW_IPS"
    
    # Deregister old targets
    for ip in $OLD_IPS; do
        aws elbv2 deregister-targets --target-group-arn "$TG_ARN" --targets Id="$ip",Port=80 --region "$AWS_REGION" 2>/dev/null || true
    done
    
    # Register new targets
    for ip in $NEW_IPS; do
        aws elbv2 register-targets --target-group-arn "$TG_ARN" --targets Id="$ip",Port=80 --region "$AWS_REGION"
    done
    
    print_step "Waiting for health checks..."
    sleep 30
    
    aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$AWS_REGION" --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' --output table
}

# Main
main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Tinder for Languages - Deploy to ${YELLOW}$DEPLOY_REGION${BLUE} ($AWS_REGION)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    case "$COMMAND" in
        secrets)
            load_secrets
            ;;
        prereq)
            check_prerequisites
            ;;
        ecr)
            load_secrets
            ecr_login
            ;;
        build)
            load_secrets
            ecr_login
            build_and_push
            ;;
        terraform)
            load_secrets
            deploy_terraform
            ;;
        kubectl)
            load_secrets
            configure_kubectl
            ;;
        k8s)
            load_secrets
            deploy_kubernetes
            ;;
        nlb)
            load_secrets
            update_nlb
            ;;
        status)
            load_secrets
            show_status
            ;;
        all)
            load_secrets
            check_prerequisites
            ecr_login
            build_and_push
            deploy_terraform
            configure_kubectl
            deploy_kubernetes
            show_status
            ;;
        *)
            echo "Usage: $0 [eu|sa] {secrets|prereq|ecr|build|terraform|kubectl|k8s|nlb|status|all}"
            echo ""
            echo "Regions:"
            echo "  eu  - Europe (eu-central-1) - DEFAULT"
            echo "  sa  - South America (sa-east-1)"
            echo ""
            echo "Examples:"
            echo "  $0 status       - Show EU status"
            echo "  $0 eu build     - Build for EU"
            echo "  $0 sa all       - Full deploy to SA"
            exit 1
            ;;
    esac
}

main
