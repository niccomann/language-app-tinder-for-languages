# Deployment Guide - Tinder for Languages

This guide walks you through deploying the application from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [AWS Configuration](#aws-configuration)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Application Deployment](#application-deployment)
6. [Verification](#verification)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Tools

Install these tools on your machine:

```bash
# macOS with Homebrew
brew install awscli kubectl terraform

# Docker Desktop (download from docker.com)
```

### AWS Account

You need an AWS account with an IAM user that has these permissions:
- `AmazonEKSClusterPolicy`
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonEC2FullAccess`
- `IAMFullAccess`
- `ElasticLoadBalancingFullAccess`
- `AWSBudgetsActionsWithAWSResourceControlAccess`

---

## Initial Setup

### Step 1: Configure Secrets

```bash
cd infrastructure

# Copy the example secrets file
cp secrets/.env.example secrets/.env

# Edit with your actual values
nano secrets/.env
```

Fill in these required values:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-central-1
AWS_ACCOUNT_ID=664111151564
POSTGRES_PASSWORD=your_secure_password
SECRET_KEY=your_app_secret
```

### Step 2: Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

---

## AWS Configuration

### Create ECR Repositories (First Time Only)

```bash
source scripts/setup-secrets.sh

# Create backend repository
aws ecr create-repository --repository-name tinder-languages-backend --region $AWS_REGION

# Create frontend repository
aws ecr create-repository --repository-name tinder-languages-frontend --region $AWS_REGION
```

### Set Budget Limit (Recommended)

A $50/month budget has been configured. To verify:

```bash
aws budgets describe-budgets --account-id $AWS_ACCOUNT_ID
```

---

## Infrastructure Deployment

### Option A: Automated (Recommended)

```bash
# Deploy everything with one command
./scripts/deploy.sh all
```

This will:
1. Load secrets
2. Check prerequisites
3. Login to ECR
4. Build and push Docker images
5. Create EKS cluster with Terraform
6. Configure kubectl
7. Deploy Kubernetes manifests
8. Show status

### Option B: Step by Step

```bash
# 1. Load secrets
source scripts/setup-secrets.sh

# 2. Initialize and apply Terraform
cd terraform
terraform init
terraform apply -auto-approve
cd ..

# 3. Configure kubectl
aws eks update-kubeconfig --name tinder-languages-cluster --region $AWS_REGION

# 4. Add cluster access
aws eks create-access-entry \
  --cluster-name tinder-languages-cluster \
  --principal-arn $(aws sts get-caller-identity --query Arn --output text) \
  --type STANDARD

aws eks associate-access-policy \
  --cluster-name tinder-languages-cluster \
  --principal-arn $(aws sts get-caller-identity --query Arn --output text) \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster

# 5. Build and push images
./scripts/deploy.sh build

# 6. Deploy to Kubernetes
./scripts/deploy.sh k8s
```

---

## Application Deployment

### Deploy Kubernetes Manifests

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### Check Deployment Status

```bash
# View all pods
kubectl get pods -n tinder-languages

# View services
kubectl get svc -n tinder-languages

# View logs
kubectl logs -f deployment/backend -n tinder-languages
```

---

## Verification

### Check Everything is Running

```bash
./scripts/status.sh
```

### Open the Dashboard

```bash
open dashboard/index.html
```

### Get the Frontend URL

```bash
kubectl get svc frontend-service -n tinder-languages \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

---

## Maintenance

### Update Application

```bash
# Rebuild and push images
./scripts/deploy.sh build

# Restart deployments to pull new images
kubectl rollout restart deployment/backend -n tinder-languages
kubectl rollout restart deployment/frontend -n tinder-languages
```

### Scale Pods

```bash
# Scale backend to 3 replicas
kubectl scale deployment/backend --replicas=3 -n tinder-languages

# Scale to 0 (stop paying for compute)
kubectl scale deployment/backend --replicas=0 -n tinder-languages
kubectl scale deployment/frontend --replicas=0 -n tinder-languages
```

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n tinder-languages

# Frontend logs
kubectl logs -f deployment/frontend -n tinder-languages

# PostgreSQL logs
kubectl logs -f deployment/postgres -n tinder-languages
```

### Destroy Everything

```bash
./scripts/destroy.sh
```

---

## Cost Optimization Tips

1. **Scale to zero when not in use**
   ```bash
   kubectl scale deployment --all --replicas=0 -n tinder-languages
   ```

2. **Use Fargate Spot** (for non-critical workloads)
   - Modify terraform/main.tf to use Fargate Spot

3. **Monitor costs**
   - Check AWS Cost Explorer regularly
   - Budget alerts are set at 80% ($40)

---

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n tinder-languages
kubectl logs <pod-name> -n tinder-languages
```

### Image pull errors

```bash
# Re-login to ECR
./scripts/deploy.sh ecr

# Rebuild and push
./scripts/deploy.sh build
```

### kubectl connection issues

```bash
# Reconfigure kubectl
./scripts/deploy.sh kubectl
```

### Terraform state issues

```bash
cd terraform
terraform refresh
terraform plan
```
