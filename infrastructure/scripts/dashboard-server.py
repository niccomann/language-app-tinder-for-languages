#!/usr/bin/env python3
"""
Dashboard Server - Provides API endpoints to execute kubectl commands from UI.
Run with: python3 dashboard-server.py
Access at: http://localhost:8888
"""

import http.server
import json
import os
import subprocess
import urllib.parse
from pathlib import Path

PORT = 8888
SCRIPT_DIR = Path(__file__).parent
DASHBOARD_DIR = SCRIPT_DIR.parent / "dashboard"

# AWS credentials must come from the environment (or AWS config). Do NOT
# hardcode them here — this file is in version control.
for var in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
    if not os.environ.get(var):
        raise RuntimeError(f"{var} must be set in the environment")
os.environ.setdefault("AWS_REGION", "eu-central-1")
os.environ.setdefault("AWS_DEFAULT_REGION", "eu-central-1")

# Configuration
VPC_ID = "vpc-0c84dfdf3ba8a9c85"
TARGET_GROUP_ARN = "arn:aws:elasticloadbalancing:eu-central-1:664111151564:targetgroup/tinder-frontend-tg/0873733a1cdc5537"
NLB_ARN = "arn:aws:elasticloadbalancing:eu-central-1:664111151564:loadbalancer/net/tinder-frontend-nlb/60cb3490ce637976"
NLB_DNS = "tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com"
EKS_CLUSTER_SG = "sg-0d70c608c2ebd59a1"
NODE_SG = "sg-0ed0ca09861d06db0"
PUBLIC_SUBNETS = "subnet-0ba31b8e8256b76dd subnet-0000622edaa324723 subnet-0db531915d516670d"
NAMESPACE = "tinder-languages"
CLUSTER_NAME = "tinder-languages-cluster"

# Allowed commands (whitelist for security)
ALLOWED_COMMANDS = {
    # === KUBERNETES STATUS ===
    "get_pods": "kubectl get pods -n tinder-languages -o wide",
    "get_services": "kubectl get svc -n tinder-languages",
    "get_nodes": "kubectl get nodes",
    "get_ingress": "kubectl get ingress -n tinder-languages",
    "get_events": "kubectl get events -n tinder-languages --sort-by='.lastTimestamp' | tail -20",
    "get_all": "kubectl get all -n tinder-languages",
    "describe_pods": "kubectl describe pods -n tinder-languages",
    "describe_backend": "kubectl describe deployment/backend -n tinder-languages",
    "describe_frontend": "kubectl describe deployment/frontend -n tinder-languages",
    
    # === LOGS ===
    "logs_backend": "kubectl logs -l app=backend -n tinder-languages --tail=50",
    "logs_frontend": "kubectl logs -l app=frontend -n tinder-languages --tail=50",
    "logs_backend_previous": "kubectl logs -l app=backend -n tinder-languages --tail=50 --previous 2>/dev/null || echo 'No previous logs'",
    "logs_frontend_previous": "kubectl logs -l app=frontend -n tinder-languages --tail=50 --previous 2>/dev/null || echo 'No previous logs'",
    
    # === RESTART/ROLLOUT ===
    "restart_backend": "kubectl rollout restart deployment/backend -n tinder-languages",
    "restart_frontend": "kubectl rollout restart deployment/frontend -n tinder-languages",
    "rollout_status_backend": "kubectl rollout status deployment/backend -n tinder-languages --timeout=60s",
    "rollout_status_frontend": "kubectl rollout status deployment/frontend -n tinder-languages --timeout=60s",
    
    # === SCALE ===
    "scale_backend_0": "kubectl scale deployment/backend -n tinder-languages --replicas=0",
    "scale_backend_1": "kubectl scale deployment/backend -n tinder-languages --replicas=1",
    "scale_backend_2": "kubectl scale deployment/backend -n tinder-languages --replicas=2",
    "scale_backend_3": "kubectl scale deployment/backend -n tinder-languages --replicas=3",
    "scale_frontend_0": "kubectl scale deployment/frontend -n tinder-languages --replicas=0",
    "scale_frontend_1": "kubectl scale deployment/frontend -n tinder-languages --replicas=1",
    "scale_frontend_2": "kubectl scale deployment/frontend -n tinder-languages --replicas=2",
    "scale_frontend_3": "kubectl scale deployment/frontend -n tinder-languages --replicas=3",
    
    # === NLB STATUS ===
    "nlb_status": "aws elbv2 describe-load-balancers --names tinder-frontend-nlb --query 'LoadBalancers[0].[DNSName,State.Code]' --output text",
    "nlb_details": "aws elbv2 describe-load-balancers --names tinder-frontend-nlb",
    "target_health": f"aws elbv2 describe-target-health --target-group-arn {TARGET_GROUP_ARN} --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason]' --output table",
    "target_group_info": f"aws elbv2 describe-target-groups --target-group-arns {TARGET_GROUP_ARN}",
    "list_load_balancers": "aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' --output table",
    
    # === NLB MANAGEMENT ===
    "update_targets": str(SCRIPT_DIR / "nlb-manage.sh") + " update",
    "get_pod_ips": "kubectl get pods -n tinder-languages -l app=frontend -o jsonpath='{.items[*].status.podIP}'",
    "register_targets": f"kubectl get pods -n tinder-languages -l app=frontend -o jsonpath='{{.items[*].status.podIP}}' | xargs -I{{}} aws elbv2 register-targets --target-group-arn {TARGET_GROUP_ARN} --targets Id={{}},Port=80",
    "deregister_all_targets": f"aws elbv2 describe-target-health --target-group-arn {TARGET_GROUP_ARN} --query 'TargetHealthDescriptions[*].Target.Id' --output text | xargs -n1 -I{{}} aws elbv2 deregister-targets --target-group-arn {TARGET_GROUP_ARN} --targets Id={{}},Port=80",
    
    # === NLB CREATE (DANGEROUS) ===
    "create_target_group": f"aws elbv2 create-target-group --name tinder-frontend-tg --protocol TCP --port 80 --vpc-id {VPC_ID} --target-type ip --health-check-protocol TCP --health-check-port 80",
    "create_nlb": f"aws elbv2 create-load-balancer --name tinder-frontend-nlb --type network --subnets {PUBLIC_SUBNETS} --scheme internet-facing",
    "enable_cross_zone": f"aws elbv2 modify-load-balancer-attributes --load-balancer-arn {NLB_ARN} --attributes Key=load_balancing.cross_zone.enabled,Value=true",
    
    # === SECURITY GROUPS ===
    "list_security_groups": f"aws ec2 describe-security-groups --filters 'Name=vpc-id,Values={VPC_ID}' --query 'SecurityGroups[*].[GroupId,GroupName]' --output table",
    "sg_rules_cluster": f"aws ec2 describe-security-group-rules --filters 'Name=group-id,Values={EKS_CLUSTER_SG}' --query 'SecurityGroupRules[*].[SecurityGroupRuleId,IpProtocol,FromPort,ToPort,CidrIpv4]' --output table",
    "sg_rules_node": f"aws ec2 describe-security-group-rules --filters 'Name=group-id,Values={NODE_SG}' --query 'SecurityGroupRules[*].[SecurityGroupRuleId,IpProtocol,FromPort,ToPort,CidrIpv4]' --output table",
    "add_sg_rule_cluster_80": f"aws ec2 authorize-security-group-ingress --group-id {EKS_CLUSTER_SG} --protocol tcp --port 80 --cidr 0.0.0.0/0 2>&1 || echo 'Rule may already exist'",
    "add_sg_rule_node_80": f"aws ec2 authorize-security-group-ingress --group-id {NODE_SG} --protocol tcp --port 80 --cidr 10.0.0.0/16 2>&1 || echo 'Rule may already exist'",
    
    # === EKS CLUSTER ===
    "eks_cluster_info": f"aws eks describe-cluster --name {CLUSTER_NAME} --query 'cluster.[name,status,version,endpoint]' --output table",
    "eks_fargate_profiles": f"aws eks list-fargate-profiles --cluster-name {CLUSTER_NAME}",
    "update_kubeconfig": f"aws eks update-kubeconfig --name {CLUSTER_NAME} --region eu-central-1",
    
    # === ECR ===
    "ecr_repos": "aws ecr describe-repositories --query 'repositories[*].[repositoryName,repositoryUri]' --output table",
    "ecr_images_backend": "aws ecr describe-images --repository-name tinder-languages-backend --query 'imageDetails[*].[imageTags[0],imagePushedAt]' --output table 2>/dev/null || echo 'No images'",
    "ecr_images_frontend": "aws ecr describe-images --repository-name tinder-languages-frontend --query 'imageDetails[*].[imageTags[0],imagePushedAt]' --output table 2>/dev/null || echo 'No images'",
    "ecr_login": "aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 664111151564.dkr.ecr.eu-central-1.amazonaws.com",
    
    # === DOCKER BUILD & PUSH ===
    "docker_build_backend": f"cd {SCRIPT_DIR}/../../backend && docker build --platform linux/amd64 -t 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-backend:latest .",
    "docker_build_frontend": f"cd {SCRIPT_DIR}/../../frontend && docker build --platform linux/amd64 -t 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-frontend:latest .",
    "docker_push_backend": "docker push 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-backend:latest",
    "docker_push_frontend": "docker push 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-frontend:latest",
    
    # === KUBERNETES APPLY ===
    "apply_namespace": f"kubectl apply -f {SCRIPT_DIR}/../k8s/namespace.yaml",
    "apply_secrets": f"kubectl apply -f {SCRIPT_DIR}/../k8s/secrets.yaml",
    "apply_backend": f"kubectl apply -f {SCRIPT_DIR}/../k8s/backend-deployment.yaml",
    "apply_frontend": f"kubectl apply -f {SCRIPT_DIR}/../k8s/frontend-deployment.yaml",
    "apply_all": f"kubectl apply -f {SCRIPT_DIR}/../k8s/",
    "delete_backend": "kubectl delete deployment/backend -n tinder-languages",
    "delete_frontend": "kubectl delete deployment/frontend -n tinder-languages",
    
    # === TERRAFORM ===
    "terraform_init": f"cd {SCRIPT_DIR}/../terraform && terraform init",
    "terraform_plan": f"cd {SCRIPT_DIR}/../terraform && terraform plan",
    "terraform_apply": f"cd {SCRIPT_DIR}/../terraform && terraform apply -auto-approve",
    "terraform_destroy": f"cd {SCRIPT_DIR}/../terraform && terraform destroy -auto-approve",
    "terraform_output": f"cd {SCRIPT_DIR}/../terraform && terraform output",
    
    # === SCRIPTS ===
    "run_deploy": str(SCRIPT_DIR / "deploy.sh"),
    "run_status": str(SCRIPT_DIR / "status.sh"),
    "run_destroy": str(SCRIPT_DIR / "destroy.sh"),
    
    # === HTTP CHECK ===
    "http_check": f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 5 http://{NLB_DNS}/",
    "http_check_verbose": f"curl -v --max-time 10 http://{NLB_DNS}/ 2>&1",
    "http_check_backend": "kubectl exec -n tinder-languages $(kubectl get pods -n tinder-languages -l app=frontend -o jsonpath='{.items[0].metadata.name}') -- curl -s http://backend-service:8500/health 2>/dev/null || echo 'Backend health check failed'",
    
    # === AWS INFO ===
    "aws_identity": "aws sts get-caller-identity",
    "aws_region": "aws configure get region",
    "vpc_info": f"aws ec2 describe-vpcs --vpc-ids {VPC_ID} --query 'Vpcs[0].[VpcId,CidrBlock,State]' --output table",
    "subnets_info": f"aws ec2 describe-subnets --filters 'Name=vpc-id,Values={VPC_ID}' --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' --output table",
}


def run_command(command_key):
    """Execute a whitelisted command and return output."""
    if command_key not in ALLOWED_COMMANDS:
        return {"error": f"Command '{command_key}' not allowed", "success": False}
    
    cmd = ALLOWED_COMMANDS[command_key]
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
            env=os.environ
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout or result.stderr,
            "command": cmd,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}


def get_full_status():
    """Get complete cluster status."""
    status = {}
    for key in ["get_pods", "get_services", "get_nodes", "nlb_status", "target_health", "http_check"]:
        status[key] = run_command(key)
    return status


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler for dashboard API."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == "/api/status":
            self.send_json(get_full_status())
        elif parsed.path == "/api/commands":
            self.send_json({"commands": list(ALLOWED_COMMANDS.keys())})
        elif parsed.path.startswith("/api/run/"):
            command_key = parsed.path.replace("/api/run/", "")
            self.send_json(run_command(command_key))
        elif parsed.path == "/" or parsed.path == "/index.html":
            self.serve_dashboard()
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path.startswith("/api/run/"):
            command_key = parsed.path.replace("/api/run/", "")
            self.send_json(run_command(command_key))
        else:
            self.send_error(404)
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def serve_dashboard(self):
        """Serve the interactive dashboard."""
        html = generate_dashboard_html()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())


def generate_dashboard_html():
    """Generate the interactive dashboard HTML."""
    return '''<!DOCTYPE html>
<html>
<head>
    <title>Tinder Languages - Infrastructure Control Panel</title>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); 
            color: #eee; 
            min-height: 100vh;
            padding: 15px;
        }
        .container { max-width: 1800px; margin: 0 auto; }
        
        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(0,212,255,0.1);
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid #00d4ff33;
        }
        h1 { color: #00d4ff; font-size: 1.5em; }
        .status-badge {
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
        }
        .status-badge.online { background: #00ff8833; border: 2px solid #00ff88; color: #00ff88; }
        .status-badge.offline { background: #ff444433; border: 2px solid #ff4444; color: #ff4444; }
        .status-badge.checking { background: #ffaa0033; border: 2px solid #ffaa00; color: #ffaa00; }
        
        /* URL Banner */
        .url-banner {
            background: linear-gradient(90deg, #00d4ff11, #ff6b6b11);
            border: 1px solid #00d4ff44;
            border-radius: 10px;
            padding: 12px 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .url-banner a { color: #00ff88; text-decoration: none; }
        
        /* Grid Layout */
        .main-grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 20px;
        }
        
        /* Sidebar */
        .sidebar {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #2a3f5f;
            max-height: calc(100vh - 180px);
            overflow-y: auto;
        }
        .sidebar h2 {
            color: #ff6b6b;
            font-size: 0.95em;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #2a3f5f;
            position: sticky;
            top: 0;
            background: #16213e;
        }
        
        /* Tabs */
        .tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 15px;
        }
        .tab {
            padding: 6px 12px;
            background: #1e2a4a;
            border: 1px solid #2a3f5f;
            border-radius: 6px;
            color: #888;
            cursor: pointer;
            font-size: 0.75em;
            transition: all 0.2s;
        }
        .tab:hover, .tab.active {
            background: #00d4ff22;
            border-color: #00d4ff;
            color: #00d4ff;
        }
        
        /* Command Buttons */
        .cmd-section { display: none; }
        .cmd-section.active { display: block; }
        .cmd-group { margin-bottom: 15px; }
        .cmd-group-title {
            color: #888;
            font-size: 0.7em;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 1px;
        }
        .cmd-btn {
            display: block;
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 5px;
            background: linear-gradient(145deg, #1e2a4a, #16213e);
            border: 1px solid #2a3f5f;
            border-radius: 6px;
            color: #eee;
            cursor: pointer;
            text-align: left;
            font-size: 0.8em;
            transition: all 0.2s;
        }
        .cmd-btn:hover {
            background: linear-gradient(145deg, #2a3f5f, #1e2a4a);
            border-color: #00d4ff;
            transform: translateX(2px);
        }
        .cmd-btn.danger { border-left: 3px solid #ff6b6b; }
        .cmd-btn.success { border-left: 3px solid #00ff88; }
        .cmd-btn.warning { border-left: 3px solid #ffaa00; }
        .cmd-btn.info { border-left: 3px solid #00d4ff; }
        
        /* Main Content */
        .main-content { display: flex; flex-direction: column; gap: 15px; }
        
        /* Status Cards */
        .status-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
        }
        .status-card {
            background: linear-gradient(145deg, #1e2a4a, #16213e);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            border: 1px solid #2a3f5f;
        }
        .status-card .icon { font-size: 1.5em; margin-bottom: 5px; }
        .status-card .label { color: #888; font-size: 0.7em; text-transform: uppercase; }
        .status-card .value { font-size: 1.1em; font-weight: bold; margin-top: 3px; }
        .status-card.healthy .value { color: #00ff88; }
        .status-card.warning .value { color: #ffaa00; }
        .status-card.error .value { color: #ff4444; }
        
        /* Output Panel */
        .output-panel {
            background: #0f0f1a;
            border-radius: 10px;
            border: 1px solid #2a3f5f;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 400px;
        }
        .output-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background: #16213e;
            border-radius: 10px 10px 0 0;
            border-bottom: 1px solid #2a3f5f;
        }
        .output-header h3 { color: #00d4ff; font-size: 0.9em; }
        .output-content {
            padding: 12px;
            flex: 1;
            overflow: auto;
            max-height: 500px;
        }
        .output-content pre {
            background: transparent;
            color: #00ff88;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 11px;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 0;
        }
        .output-content pre.error { color: #ff6b6b; }
        
        /* Loading */
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #00d4ff33;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Quick Actions */
        .quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .quick-btn {
            padding: 6px 12px;
            background: #00d4ff22;
            border: 1px solid #00d4ff;
            border-radius: 15px;
            color: #00d4ff;
            cursor: pointer;
            font-size: 0.75em;
        }
        .quick-btn:hover { background: #00d4ff44; }
        
        /* Confirmation Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        .modal.show { display: flex; }
        .modal-content {
            background: #16213e;
            border: 2px solid #ff6b6b;
            border-radius: 15px;
            padding: 25px;
            max-width: 500px;
            text-align: center;
        }
        .modal-content h3 { color: #ff6b6b; margin-bottom: 15px; }
        .modal-content p { margin-bottom: 20px; color: #888; }
        .modal-content code { background: #0f0f1a; padding: 10px; display: block; margin: 10px 0; border-radius: 5px; font-size: 0.85em; }
        .modal-buttons { display: flex; gap: 10px; justify-content: center; }
        .modal-btn {
            padding: 10px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        .modal-btn.cancel { background: #2a3f5f; border: 1px solid #2a3f5f; color: #888; }
        .modal-btn.confirm { background: #ff6b6b33; border: 2px solid #ff6b6b; color: #ff6b6b; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 Tinder Languages - Control Panel</h1>
            <div id="app-status" class="status-badge checking">Checking...</div>
        </header>
        
        <div class="url-banner">
            <div>
                <strong>🌐</strong>
                <a href="http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com" target="_blank">
                    tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com
                </a>
            </div>
            <div class="quick-actions">
                <button class="quick-btn" onclick="runCommand('http_check')">🔍 HTTP Check</button>
                <button class="quick-btn" onclick="refreshStatus()">🔄 Refresh</button>
                <button class="quick-btn" onclick="runCommand('get_all')">📊 Get All</button>
            </div>
        </div>
        
        <div class="main-grid">
            <!-- Sidebar with Commands -->
            <div class="sidebar">
                <h2>⚡ Commands</h2>
                
                <!-- Tabs -->
                <div class="tabs">
                    <div class="tab active" onclick="showSection('k8s')">☸️ K8s</div>
                    <div class="tab" onclick="showSection('nlb')">🔗 NLB</div>
                    <div class="tab" onclick="showSection('docker')">🐳 Docker</div>
                    <div class="tab" onclick="showSection('terraform')">🏗️ Terraform</div>
                    <div class="tab" onclick="showSection('aws')">☁️ AWS</div>
                    <div class="tab" onclick="showSection('danger')">⚠️ Danger</div>
                </div>
                
                <!-- K8s Section -->
                <div id="section-k8s" class="cmd-section active">
                    <div class="cmd-group">
                        <div class="cmd-group-title">📊 Status</div>
                        <button class="cmd-btn info" onclick="runCommand('get_pods')">Get Pods</button>
                        <button class="cmd-btn info" onclick="runCommand('get_services')">Get Services</button>
                        <button class="cmd-btn info" onclick="runCommand('get_nodes')">Get Nodes</button>
                        <button class="cmd-btn info" onclick="runCommand('get_events')">Get Events</button>
                        <button class="cmd-btn info" onclick="runCommand('get_all')">Get All Resources</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔍 Describe</div>
                        <button class="cmd-btn info" onclick="runCommand('describe_pods')">Describe Pods</button>
                        <button class="cmd-btn info" onclick="runCommand('describe_backend')">Describe Backend</button>
                        <button class="cmd-btn info" onclick="runCommand('describe_frontend')">Describe Frontend</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">📋 Logs</div>
                        <button class="cmd-btn info" onclick="runCommand('logs_backend')">Backend Logs</button>
                        <button class="cmd-btn info" onclick="runCommand('logs_frontend')">Frontend Logs</button>
                        <button class="cmd-btn info" onclick="runCommand('logs_backend_previous')">Backend Previous</button>
                        <button class="cmd-btn info" onclick="runCommand('logs_frontend_previous')">Frontend Previous</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔄 Restart</div>
                        <button class="cmd-btn warning" onclick="runCommand('restart_backend')">Restart Backend</button>
                        <button class="cmd-btn warning" onclick="runCommand('restart_frontend')">Restart Frontend</button>
                        <button class="cmd-btn info" onclick="runCommand('rollout_status_backend')">Rollout Status Backend</button>
                        <button class="cmd-btn info" onclick="runCommand('rollout_status_frontend')">Rollout Status Frontend</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">📈 Scale Backend</div>
                        <button class="cmd-btn danger" onclick="confirmCommand('scale_backend_0', 'Scale Backend to 0 replicas?')">→ 0</button>
                        <button class="cmd-btn warning" onclick="runCommand('scale_backend_1')">→ 1</button>
                        <button class="cmd-btn success" onclick="runCommand('scale_backend_2')">→ 2</button>
                        <button class="cmd-btn success" onclick="runCommand('scale_backend_3')">→ 3</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">📈 Scale Frontend</div>
                        <button class="cmd-btn danger" onclick="confirmCommand('scale_frontend_0', 'Scale Frontend to 0 replicas?')">→ 0</button>
                        <button class="cmd-btn warning" onclick="runCommand('scale_frontend_1')">→ 1</button>
                        <button class="cmd-btn success" onclick="runCommand('scale_frontend_2')">→ 2</button>
                        <button class="cmd-btn success" onclick="runCommand('scale_frontend_3')">→ 3</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">📦 Apply Manifests</div>
                        <button class="cmd-btn success" onclick="runCommand('apply_all')">Apply All</button>
                        <button class="cmd-btn info" onclick="runCommand('apply_namespace')">Apply Namespace</button>
                        <button class="cmd-btn info" onclick="runCommand('apply_secrets')">Apply Secrets</button>
                        <button class="cmd-btn info" onclick="runCommand('apply_backend')">Apply Backend</button>
                        <button class="cmd-btn info" onclick="runCommand('apply_frontend')">Apply Frontend</button>
                    </div>
                </div>
                
                <!-- NLB Section -->
                <div id="section-nlb" class="cmd-section">
                    <div class="cmd-group">
                        <div class="cmd-group-title">📊 Status</div>
                        <button class="cmd-btn info" onclick="runCommand('nlb_status')">NLB Status</button>
                        <button class="cmd-btn info" onclick="runCommand('nlb_details')">NLB Details</button>
                        <button class="cmd-btn info" onclick="runCommand('target_health')">Target Health</button>
                        <button class="cmd-btn info" onclick="runCommand('target_group_info')">Target Group Info</button>
                        <button class="cmd-btn info" onclick="runCommand('list_load_balancers')">List All LBs</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🎯 Targets</div>
                        <button class="cmd-btn info" onclick="runCommand('get_pod_ips')">Get Pod IPs</button>
                        <button class="cmd-btn warning" onclick="runCommand('update_targets')">Update Targets</button>
                        <button class="cmd-btn danger" onclick="confirmCommand('deregister_all_targets', 'Deregister ALL targets?')">Deregister All</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔧 Configuration</div>
                        <button class="cmd-btn warning" onclick="runCommand('enable_cross_zone')">Enable Cross-Zone</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔒 Security Groups</div>
                        <button class="cmd-btn info" onclick="runCommand('list_security_groups')">List SGs</button>
                        <button class="cmd-btn info" onclick="runCommand('sg_rules_cluster')">Cluster SG Rules</button>
                        <button class="cmd-btn info" onclick="runCommand('sg_rules_node')">Node SG Rules</button>
                        <button class="cmd-btn warning" onclick="runCommand('add_sg_rule_cluster_80')">Add Port 80 (Cluster)</button>
                        <button class="cmd-btn warning" onclick="runCommand('add_sg_rule_node_80')">Add Port 80 (Node)</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🌐 HTTP Check</div>
                        <button class="cmd-btn info" onclick="runCommand('http_check')">Quick Check</button>
                        <button class="cmd-btn info" onclick="runCommand('http_check_verbose')">Verbose Check</button>
                        <button class="cmd-btn info" onclick="runCommand('http_check_backend')">Backend Health</button>
                    </div>
                </div>
                
                <!-- Docker Section -->
                <div id="section-docker" class="cmd-section">
                    <div class="cmd-group">
                        <div class="cmd-group-title">📦 ECR</div>
                        <button class="cmd-btn info" onclick="runCommand('ecr_repos')">List Repos</button>
                        <button class="cmd-btn info" onclick="runCommand('ecr_images_backend')">Backend Images</button>
                        <button class="cmd-btn info" onclick="runCommand('ecr_images_frontend')">Frontend Images</button>
                        <button class="cmd-btn warning" onclick="runCommand('ecr_login')">ECR Login</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔨 Build</div>
                        <button class="cmd-btn warning" onclick="confirmCommand('docker_build_backend', 'Build Backend Docker image?')">Build Backend</button>
                        <button class="cmd-btn warning" onclick="confirmCommand('docker_build_frontend', 'Build Frontend Docker image?')">Build Frontend</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🚀 Push</div>
                        <button class="cmd-btn warning" onclick="confirmCommand('docker_push_backend', 'Push Backend to ECR?')">Push Backend</button>
                        <button class="cmd-btn warning" onclick="confirmCommand('docker_push_frontend', 'Push Frontend to ECR?')">Push Frontend</button>
                    </div>
                </div>
                
                <!-- Terraform Section -->
                <div id="section-terraform" class="cmd-section">
                    <div class="cmd-group">
                        <div class="cmd-group-title">📊 Info</div>
                        <button class="cmd-btn info" onclick="runCommand('terraform_output')">Terraform Output</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔧 Commands</div>
                        <button class="cmd-btn info" onclick="runCommand('terraform_init')">Terraform Init</button>
                        <button class="cmd-btn warning" onclick="runCommand('terraform_plan')">Terraform Plan</button>
                        <button class="cmd-btn danger" onclick="confirmCommand('terraform_apply', 'Apply Terraform changes? This may create/modify AWS resources.')">Terraform Apply</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">⚠️ Destroy</div>
                        <button class="cmd-btn danger" onclick="confirmCommand('terraform_destroy', 'DESTROY all Terraform resources? This cannot be undone!')">Terraform Destroy</button>
                    </div>
                </div>
                
                <!-- AWS Section -->
                <div id="section-aws" class="cmd-section">
                    <div class="cmd-group">
                        <div class="cmd-group-title">👤 Identity</div>
                        <button class="cmd-btn info" onclick="runCommand('aws_identity')">AWS Identity</button>
                        <button class="cmd-btn info" onclick="runCommand('aws_region')">AWS Region</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">☸️ EKS</div>
                        <button class="cmd-btn info" onclick="runCommand('eks_cluster_info')">Cluster Info</button>
                        <button class="cmd-btn info" onclick="runCommand('eks_fargate_profiles')">Fargate Profiles</button>
                        <button class="cmd-btn warning" onclick="runCommand('update_kubeconfig')">Update Kubeconfig</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🌐 VPC</div>
                        <button class="cmd-btn info" onclick="runCommand('vpc_info')">VPC Info</button>
                        <button class="cmd-btn info" onclick="runCommand('subnets_info')">Subnets Info</button>
                    </div>
                </div>
                
                <!-- Danger Section -->
                <div id="section-danger" class="cmd-section">
                    <div class="cmd-group">
                        <div class="cmd-group-title">⚠️ Delete Resources</div>
                        <button class="cmd-btn danger" onclick="confirmCommand('delete_backend', 'Delete Backend deployment?')">Delete Backend</button>
                        <button class="cmd-btn danger" onclick="confirmCommand('delete_frontend', 'Delete Frontend deployment?')">Delete Frontend</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">🔗 Create NLB (if not exists)</div>
                        <button class="cmd-btn danger" onclick="confirmCommand('create_target_group', 'Create new Target Group?')">Create Target Group</button>
                        <button class="cmd-btn danger" onclick="confirmCommand('create_nlb', 'Create new NLB?')">Create NLB</button>
                    </div>
                    <div class="cmd-group">
                        <div class="cmd-group-title">📜 Scripts</div>
                        <button class="cmd-btn warning" onclick="confirmCommand('run_deploy', 'Run full deploy script?')">Run Deploy</button>
                        <button class="cmd-btn info" onclick="runCommand('run_status')">Run Status</button>
                        <button class="cmd-btn danger" onclick="confirmCommand('run_destroy', 'Run DESTROY script? This will delete everything!')">Run Destroy</button>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="main-content">
                <!-- Status Cards -->
                <div class="status-cards">
                    <div class="status-card healthy" id="card-cluster">
                        <div class="icon">☸️</div>
                        <div class="label">Cluster</div>
                        <div class="value">Active</div>
                    </div>
                    <div class="status-card" id="card-pods">
                        <div class="icon">📦</div>
                        <div class="label">Pods</div>
                        <div class="value">-</div>
                    </div>
                    <div class="status-card" id="card-nlb">
                        <div class="icon">🔗</div>
                        <div class="label">NLB</div>
                        <div class="value">-</div>
                    </div>
                    <div class="status-card" id="card-targets">
                        <div class="icon">🎯</div>
                        <div class="label">Targets</div>
                        <div class="value">-</div>
                    </div>
                    <div class="status-card" id="card-http">
                        <div class="icon">🌍</div>
                        <div class="label">HTTP</div>
                        <div class="value">-</div>
                    </div>
                </div>
                
                <!-- Output Panel -->
                <div class="output-panel">
                    <div class="output-header">
                        <h3>📟 Command Output</h3>
                        <span class="cmd-info" id="cmd-info">Ready</span>
                    </div>
                    <div class="output-content">
                        <pre id="output">Click a command to see output here...

Available sections:
• K8s - Kubernetes management (pods, services, logs, scale)
• NLB - Load Balancer management (targets, security groups)
• Docker - Build and push images to ECR
• Terraform - Infrastructure as code
• AWS - AWS account and EKS info
• Danger - Destructive operations (with confirmation)</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Confirmation Modal -->
    <div id="modal" class="modal">
        <div class="modal-content">
            <h3>⚠️ Confirm Action</h3>
            <p id="modal-message">Are you sure?</p>
            <code id="modal-command"></code>
            <div class="modal-buttons">
                <button class="modal-btn cancel" onclick="closeModal()">Cancel</button>
                <button class="modal-btn confirm" onclick="executeConfirmed()">Execute</button>
            </div>
        </div>
    </div>
    
    <script>
        let pendingCommand = null;
        
        function showSection(name) {
            document.querySelectorAll('.cmd-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('section-' + name).classList.add('active');
            event.target.classList.add('active');
        }
        
        async function runCommand(cmd) {
            const output = document.getElementById('output');
            const cmdInfo = document.getElementById('cmd-info');
            
            output.textContent = 'Running...';
            output.className = '';
            cmdInfo.innerHTML = '<span class="loading"></span> ' + cmd;
            
            try {
                const response = await fetch('/api/run/' + cmd);
                const data = await response.json();
                
                if (data.success) {
                    output.textContent = data.output || 'Command completed successfully';
                    output.className = '';
                } else {
                    output.textContent = data.error || data.output || 'Command failed';
                    output.className = 'error';
                }
                cmdInfo.textContent = cmd + ' (exit: ' + (data.returncode || 0) + ')';
            } catch (e) {
                output.textContent = 'Error: ' + e.message;
                output.className = 'error';
                cmdInfo.textContent = 'Failed';
            }
        }
        
        function confirmCommand(cmd, message) {
            pendingCommand = cmd;
            document.getElementById('modal-message').textContent = message;
            document.getElementById('modal-command').textContent = cmd;
            document.getElementById('modal').classList.add('show');
        }
        
        function closeModal() {
            document.getElementById('modal').classList.remove('show');
            pendingCommand = null;
        }
        
        function executeConfirmed() {
            if (pendingCommand) {
                runCommand(pendingCommand);
                closeModal();
            }
        }
        
        async function refreshStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                const podsCard = document.getElementById('card-pods');
                if (data.get_pods && data.get_pods.success) {
                    const running = (data.get_pods.output.match(/Running/g) || []).length;
                    podsCard.querySelector('.value').textContent = running + ' Running';
                    podsCard.className = 'status-card ' + (running >= 4 ? 'healthy' : 'warning');
                }
                
                const nlbCard = document.getElementById('card-nlb');
                if (data.nlb_status && data.nlb_status.success) {
                    const state = data.nlb_status.output.split('\\t')[1] || data.nlb_status.output.split(' ')[1] || 'unknown';
                    nlbCard.querySelector('.value').textContent = state.trim();
                    nlbCard.className = 'status-card ' + (state.includes('active') ? 'healthy' : 'warning');
                }
                
                const targetsCard = document.getElementById('card-targets');
                if (data.target_health && data.target_health.success) {
                    const healthy = (data.target_health.output.match(/healthy/g) || []).length;
                    targetsCard.querySelector('.value').textContent = healthy + '/2';
                    targetsCard.className = 'status-card ' + (healthy >= 2 ? 'healthy' : 'warning');
                }
                
                const httpCard = document.getElementById('card-http');
                const statusBadge = document.getElementById('app-status');
                if (data.http_check && data.http_check.success) {
                    const code = data.http_check.output.trim();
                    httpCard.querySelector('.value').textContent = code;
                    httpCard.className = 'status-card ' + (code === '200' ? 'healthy' : 'error');
                    
                    if (code === '200') {
                        statusBadge.textContent = '✅ ONLINE';
                        statusBadge.className = 'status-badge online';
                    } else {
                        statusBadge.textContent = '⚠️ ' + code;
                        statusBadge.className = 'status-badge offline';
                    }
                }
            } catch (e) {
                console.error('Status refresh failed:', e);
            }
        }
        
        // Initial refresh
        refreshStatus();
        // Auto refresh every 30 seconds
        setInterval(refreshStatus, 30000);
    </script>
</body>
</html>'''


if __name__ == "__main__":
    print(f"🚀 Starting Dashboard Server on http://localhost:{PORT}")
    print(f"📁 Serving from: {DASHBOARD_DIR}")
    print(f"🔧 Available commands: {list(ALLOWED_COMMANDS.keys())}")
    print()
    
    with http.server.HTTPServer(("", PORT), DashboardHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
