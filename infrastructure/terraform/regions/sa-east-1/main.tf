terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region     = "sa-east-1"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  cluster_name = "tinder-languages-cluster-sa"
  region       = "sa-east-1"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = "tinder-languages-vpc-sa"
  cidr = "10.1.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = {
    Environment = "production"
    Project     = "tinder-languages"
    Region      = "south-america"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.5"

  cluster_name    = local.cluster_name
  cluster_version = "1.29"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  create_cloudwatch_log_group            = false
  cluster_enabled_log_types              = []
  create_kms_key                         = false
  cluster_encryption_config              = {}
  attach_cluster_encryption_policy       = false

  create_iam_role = false
  iam_role_arn    = aws_iam_role.eks_cluster.arn

  fargate_profiles = {
    default = {
      name = "default"
      selectors = [
        {
          namespace = "tinder-languages"
        },
        {
          namespace = "kube-system"
        }
      ]
      subnet_ids             = module.vpc.private_subnets
      create_iam_role        = false
      iam_role_arn           = aws_iam_role.eks_fargate.arn
    }
  }

  tags = {
    Environment = "production"
    Project     = "tinder-languages"
    Region      = "south-america"
  }
}

resource "aws_iam_role" "eks_cluster" {
  name = "eks-cluster-role-sa"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_fargate" {
  name = "eks-fargate-role-sa"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks-fargate-pods.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_fargate_pod_execution" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
  role       = aws_iam_role.eks_fargate.name
}

resource "aws_ecr_repository" "backend" {
  name                 = "tinder-languages-backend-sa"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = {
    Project = "tinder-languages"
    Region  = "south-america"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "tinder-languages-frontend-sa"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = {
    Project = "tinder-languages"
    Region  = "south-america"
  }
}
