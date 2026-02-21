# 🚀 AWS EKS Deployment - Phase by Phase Guide

**Complete Deployment Journey: From AWS Account to Running Application**

This guide takes you through each phase of deploying KubeCent on AWS EKS, starting from an AWS account.

---

## 📊 Deployment Overview

**Total Time:** 60-90 minutes  
**Cost Estimate:** $0.10/hour for EKS cluster + worker nodes

### Phases Summary
1. ✅ **Prerequisites Setup** (15 min)
2. ✅ **EKS Cluster Creation** (20 min)
3. ✅ **Dependencies Installation** (10 min)
4. ✅ **Application Deployment** (15 min)
5. ✅ **Verification & Testing** (10 min)
6. ✅ **Real-World Testing** (15 min)

---

## 📋 Phase 1: Prerequisites & Local Setup (15 minutes)

**Goal:** Install all required tools on your Windows machine.

### Step 1.1: Install AWS CLI

```powershell
# Download AWS CLI installer for Windows
# Visit: https://aws.amazon.com/cli/
# Or use winget:
winget install Amazon.AWSCLI

# Verify installation
aws --version
# Expected: aws-cli/2.x.x or higher
```

### Step 1.2: Configure AWS Credentials

```powershell
# Configure AWS CLI with your credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDAXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Step 1.3: Install kubectl

```powershell
# Download kubectl for Windows
curl.exe -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"

# Move to a directory in your PATH (e.g., C:\Windows\System32)
# Or create a new directory and add to PATH

# Verify installation
kubectl version --client
# Expected: Client Version: v1.28.0 or higher
```

### Step 1.4: Install Helm

```powershell
# Download Helm installer
# Visit: https://github.com/helm/helm/releases
# Or use chocolatey:
choco install kubernetes-helm

# Verify installation
helm version
# Expected: version.BuildInfo{Version:"v3.x.x"}
```

### Step 1.5: Install Docker Desktop

```powershell
# Download Docker Desktop for Windows
# Visit: https://www.docker.com/products/docker-desktop

# Install and start Docker Desktop
# Ensure it's running before proceeding

# Verify installation
docker --version
# Expected: Docker version 24.x.x or higher

docker ps
# Should show empty list (no errors)
```

### Step 1.6: Install eksctl (EKS Cluster Management Tool)

```powershell
# Download eksctl for Windows
choco install eksctl

# Or manually download from:
# https://github.com/weaveworks/eksctl/releases

# Verify installation
eksctl version
# Expected: 0.x.x or higher
```

### ✅ Phase 1 Checklist

- [ ] AWS CLI installed and configured
- [ ] AWS credentials working (`aws sts get-caller-identity` succeeds)
- [ ] kubectl installed
- [ ] Helm installed
- [ ] Docker Desktop installed and running
- [ ] eksctl installed

---

## 🏗️ Phase 2: Create EKS Cluster (20 minutes)

**Goal:** Create a managed Kubernetes cluster on AWS EKS.

### Step 2.1: Create EKS Cluster Configuration

```powershell
# Set your variables
$CLUSTER_NAME = "kubecent-cluster"
$AWS_REGION = "us-east-1"
$NODE_TYPE = "t3.medium"  # 2 vCPU, 4 GB RAM
$NODE_COUNT = 2

# Save to environment for later use
[Environment]::SetEnvironmentVariable("CLUSTER_NAME", $CLUSTER_NAME, "User")
[Environment]::SetEnvironmentVariable("AWS_REGION", $AWS_REGION, "User")
```

### Step 2.2: Create the Cluster

```powershell
# Create EKS cluster (this takes 15-20 minutes)
eksctl create cluster `
  --name $CLUSTER_NAME `
  --region $AWS_REGION `
  --nodegroup-name standard-workers `
  --node-type $NODE_TYPE `
  --nodes $NODE_COUNT `
  --nodes-min 1 `
  --nodes-max 4 `
  --managed

# This will:
# - Create VPC, subnets, security groups
# - Create EKS control plane
# - Create worker node group
# - Configure kubectl automatically
```

**⏰ Wait Time:** 15-20 minutes (get a coffee! ☕)

### Step 2.3: Verify Cluster Creation

```powershell
# Check cluster status
eksctl get cluster --name $CLUSTER_NAME --region $AWS_REGION

# Verify kubectl connection
kubectl cluster-info

# Check nodes are ready
kubectl get nodes
```

**Expected Output:**
```
NAME                          STATUS   ROLES    AGE   VERSION
ip-192-168-x-x.ec2.internal   Ready    <none>   5m    v1.28.x
ip-192-168-x-x.ec2.internal   Ready    <none>   5m    v1.28.x
```

### Step 2.4: Explore Your Cluster

```powershell
# Check all namespaces
kubectl get namespaces

# Check all pods (system pods)
kubectl get pods -A

# Check cluster resources
kubectl get all -A
```

### ✅ Phase 2 Checklist

- [ ] EKS cluster created successfully
- [ ] kubectl connected to cluster
- [ ] All nodes showing STATUS=Ready
- [ ] System pods running in kube-system namespace

---

## 📦 Phase 3: Install Dependencies (10 minutes)

**Goal:** Install Prometheus (metrics) and OpenCost (cost data) in your cluster.

### Step 3.1: Install Prometheus

```powershell
# Add Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/prometheus `
  --namespace monitoring `
  --create-namespace `
  --set server.persistentVolume.enabled=false `
  --set alertmanager.persistentVolume.enabled=false `
  --wait `
  --timeout 5m

# Wait for pods to be ready (2-3 minutes)
kubectl -n monitoring get pods -w
```

**Press Ctrl+C when all pods show Running**

### Step 3.2: Verify Prometheus

```powershell
# Check Prometheus pods
kubectl -n monitoring get pods

# Test Prometheus connection
kubectl -n monitoring port-forward svc/prometheus-server 9090:80
```

**Open browser:** http://localhost:9090 (you should see Prometheus UI)  
**Press Ctrl+C to stop port forwarding**

### Step 3.3: Install OpenCost

```powershell
# Add Helm repository
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update

# Install OpenCost
helm install opencost opencost/opencost `
  --namespace opencost `
  --create-namespace `
  --set opencost.exporter.defaultClusterId=$CLUSTER_NAME `
  --set opencost.prometheus.external.url=http://prometheus-server.monitoring.svc.cluster.local:80 `
  --wait `
  --timeout 5m

# Wait for pod to be ready (1-2 minutes)
kubectl -n opencost get pods -w
```

### Step 3.4: Verify OpenCost

```powershell
# Check OpenCost pod
kubectl -n opencost get pods

# Test OpenCost API
kubectl -n opencost port-forward svc/opencost 9003:9003
```

**Open new PowerShell window and run:**
```powershell
curl http://localhost:9003/allocation/compute
```

**You should see JSON response with cost data!**  
**Press Ctrl+C to stop port forwarding**

### ✅ Phase 3 Checklist

- [ ] Prometheus installed and running
- [ ] Prometheus UI accessible via port-forward
- [ ] OpenCost installed and running
- [ ] OpenCost API returning cost data

---

## 🐳 Phase 4: Build & Deploy Application (15 minutes)

**Goal:** Build Docker images and deploy KubeCent to your cluster.

### Step 4.1: Navigate to Project Directory

```powershell
cd C:\Users\omgho\OneDrive\Desktop\kubecent
```

### Step 4.2: Get AWS Account ID

```powershell
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
Write-Host "AWS Account ID: $AWS_ACCOUNT_ID"
```

### Step 4.3: Create ECR Repositories

```powershell
# Create repositories for Docker images
aws ecr create-repository --repository-name kubecent-backend --region $AWS_REGION
aws ecr create-repository --repository-name kubecent-frontend --region $AWS_REGION

# Login to ECR
$ecrPassword = aws ecr get-login-password --region $AWS_REGION
$ecrPassword | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

### Step 4.4: Build Docker Images

```powershell
# Build Backend Image (this takes 3-5 minutes)
Write-Host "Building backend image..." -ForegroundColor Cyan
docker build -f docker/Dockerfile.backend `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0" `
  .

# Build Frontend Image (this takes 3-5 minutes)
Write-Host "Building frontend image..." -ForegroundColor Cyan
docker build -f docker/Dockerfile.frontend `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0" `
  .
```

### Step 4.5: Push Images to ECR

```powershell
# Push Backend (1-2 minutes)
Write-Host "Pushing backend image..." -ForegroundColor Cyan
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0"

# Push Frontend (1-2 minutes)
Write-Host "Pushing frontend image..." -ForegroundColor Cyan
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0"
```

### Step 4.6: Deploy KubeCent with Helm

```powershell
# Deploy application
helm install kubecent ./helm/kubecent `
  --namespace kubecent `
  --create-namespace `
  --set image.backend.repository="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend" `
  --set image.backend.tag=v1.0.0 `
  --set image.frontend.repository="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend" `
  --set image.frontend.tag=v1.0.0 `
  --set opencost.url=http://opencost.opencost.svc.cluster.local:9003 `
  --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local:80 `
  --set service.type=LoadBalancer `
  --wait `
  --timeout 5m
```

### Step 4.7: Wait for Deployment

```powershell
# Watch pods starting up
kubectl -n kubecent get pods -w
```

**Wait until all pods show READY 2/2 or 1/1 and STATUS=Running**

### ✅ Phase 4 Checklist

- [ ] ECR repositories created
- [ ] Docker images built successfully
- [ ] Images pushed to ECR
- [ ] Helm deployment completed
- [ ] All pods running in kubecent namespace

---

## 🌐 Phase 5: Access Application (5 minutes)

**Goal:** Get the public URL and access your application.

### Step 5.1: Get LoadBalancer URL

```powershell
# Wait for LoadBalancer to be provisioned (2-3 minutes)
Write-Host "Waiting for LoadBalancer..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Get the LoadBalancer URL
kubectl -n kubecent get svc kubecent-frontend

# Get just the hostname
$KUBECENT_URL = (kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "   🎉 Application Ready!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Access KubeCent at: http://$KUBECENT_URL" -ForegroundColor Cyan
Write-Host ""
```

### Step 5.2: Open in Browser

```powershell
# Automatically open in browser
Start-Process "http://$KUBECENT_URL"
```

**You should see the KubeCent dashboard! 🎉**

### Step 5.3: Check Backend Health

```powershell
# Test backend API
curl "http://${KUBECENT_URL}/health"

# Should return: {"status":"healthy"}
```

### Step 5.4: Access API Documentation

```powershell
# Open Swagger UI
Start-Process "http://${KUBECENT_URL}/api/docs"
```

**You should see interactive API documentation!**

### ✅ Phase 5 Checklist

- [ ] LoadBalancer URL obtained
- [ ] Application accessible in browser
- [ ] Backend health check passes
- [ ] Swagger UI accessible

---

## 🧪 Phase 6: Real-World Testing (15 minutes)

**Goal:** Test the application with real workloads and verify cost tracking.

### Step 6.1: Deploy Sample Workloads

```powershell
# Create a test namespace
kubectl create namespace test-workload

# Deploy a simple nginx application
kubectl create deployment nginx --image=nginx --replicas=3 -n test-workload

# Deploy a resource-intensive app
kubectl create deployment cpu-stress --image=polinux/stress --replicas=2 -n test-workload -- stress --cpu 2 --timeout 600s

# Check deployments
kubectl -n test-workload get pods
```

### Step 6.2: Wait for Cost Data Collection

```powershell
Write-Host "Waiting for cost data to be collected (5 minutes)..." -ForegroundColor Yellow
Write-Host "OpenCost collects data every 1-2 minutes" -ForegroundColor Yellow

# Wait 5 minutes
Start-Sleep -Seconds 300
```

### Step 6.3: Test Cost APIs

```powershell
# Test cluster costs
$response = curl "http://${KUBECENT_URL}/api/v1/costs/cluster" | ConvertFrom-Json
Write-Host "Cluster Cost Data:" -ForegroundColor Cyan
$response | ConvertTo-Json

# Test namespace costs
$response = curl "http://${KUBECENT_URL}/api/v1/costs/namespaces" | ConvertFrom-Json
Write-Host "Namespace Cost Data:" -ForegroundColor Cyan
$response | ConvertTo-Json

# Test optimization recommendations
$response = curl "http://${KUBECENT_URL}/api/v1/optimizations/report" | ConvertFrom-Json
Write-Host "Optimization Report:" -ForegroundColor Cyan
$response | ConvertTo-Json
```

### Step 6.4: Verify Dashboard Features

Open the dashboard in your browser and verify:

1. **Dashboard Tab:**
   - [ ] Total cluster cost displayed
   - [ ] Number of namespaces shown
   - [ ] Cost breakdown by namespace visible
   - [ ] Charts rendering correctly

2. **Namespaces Tab:**
   - [ ] All namespaces listed
   - [ ] Cost per namespace shown
   - [ ] CPU and Memory usage visible

3. **Optimizations Tab:**
   - [ ] Recommendations displayed
   - [ ] Potential savings calculated
   - [ ] Resource efficiency metrics shown

4. **Settings Tab:**
   - [ ] OpenCost connection status: ✅ Connected
   - [ ] Prometheus connection status: ✅ Connected

### Step 6.5: Scale Application

```powershell
# Scale up frontend
kubectl -n kubecent scale deployment kubecent-frontend --replicas=3

# Verify scaling
kubectl -n kubecent get pods

# Scale test workloads
kubectl -n test-workload scale deployment nginx --replicas=5
kubectl -n test-workload scale deployment cpu-stress --replicas=4

# Wait and refresh dashboard
Write-Host "Wait 2 minutes, then refresh the dashboard to see updated costs"
```

### Step 6.6: Test High Load Scenario

```powershell
# Create multiple namespaces with workloads
1..3 | ForEach-Object {
    $ns = "app-env-$_"
    kubectl create namespace $ns
    kubectl create deployment web-$_ --image=nginx --replicas=2 -n $ns
    kubectl create deployment api-$_ --image=node:16-alpine --replicas=2 -n $ns -- sleep 3600
}

# Wait for cost data
Start-Sleep -Seconds 120

# Check the dashboard - you should see costs for all namespaces
Write-Host "Check the dashboard - you should see 6+ namespaces with cost data"
```

### ✅ Phase 6 Checklist

- [ ] Sample workloads deployed
- [ ] Cost data collecting for all namespaces
- [ ] All API endpoints returning data
- [ ] Dashboard showing real-time costs
- [ ] Optimization recommendations generated
- [ ] Scaling tested and costs updated

---

## 📊 Phase 7: Monitor & Verify (5 minutes)

**Goal:** Set up monitoring and verify everything is working correctly.

### Step 7.1: Check All Components

```powershell
# Check all namespaces
kubectl get pods -A

# Check logs for any errors
kubectl -n kubecent logs -l app=kubecent-backend --tail=50
kubectl -n kubecent logs -l app=kubecent-frontend --tail=50
kubectl -n opencost logs -l app.kubernetes.io/name=opencost --tail=50
```

### Step 7.2: Resource Usage

```powershell
# Check resource consumption
kubectl top nodes
kubectl top pods -A

# Check KubeCent resource usage
kubectl -n kubecent top pods
```

### Step 7.3: Cost Verification

```powershell
# Get detailed cost report
$costReport = curl "http://${KUBECENT_URL}/api/v1/costs/namespaces?window=24h" | ConvertFrom-Json

Write-Host "Cost Report Summary:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
$costReport | ForEach-Object {
    Write-Host "$($_.namespace): `$$($_.totalCost)" -ForegroundColor Green
}
```

### Step 7.4: Set Up Alerts (Optional)

```powershell
# Port forward to Prometheus
kubectl -n monitoring port-forward svc/prometheus-server 9090:80 &

# Open Prometheus UI
Start-Process "http://localhost:9090"

# You can configure alerts for:
# - High cost namespaces
# - Resource over-utilization
# - Cost anomalies
```

### ✅ Phase 7 Checklist

- [ ] All components healthy
- [ ] No errors in logs
- [ ] Resource usage normal
- [ ] Cost data accurate
- [ ] Monitoring configured

---

## 🎯 Phase 8: Understanding the Real-World Scenario

**Goal:** Understand how KubeCent works in production.

### What's Happening in Your Cluster?

1. **Prometheus** collects metrics from all pods and nodes every 15 seconds
2. **OpenCost** reads Prometheus metrics and calculates costs based on:
   - CPU usage × CPU cost rate
   - Memory usage × Memory cost rate
   - Storage usage × Storage cost rate
   - Network usage × Network cost rate
3. **KubeCent Backend** fetches data from OpenCost API and:
   - Aggregates costs by namespace, pod, container
   - Calculates efficiency metrics
   - Generates optimization recommendations
   - Caches data for fast dashboard response
4. **KubeCent Frontend** displays:
   - Real-time cost visualization
   - Historical trends
   - Optimization opportunities

### Real-World Use Cases Validated

✅ **Cost Allocation:** Each namespace shows its actual cost based on resource usage  
✅ **Idle Resources:** Identifies pods with reserved but unused resources  
✅ **Optimization:** Recommends right-sizing based on actual usage  
✅ **Chargebacks:** Provides data for internal billing to teams  
✅ **Budget Alerts:** Shows cost trends to prevent budget overruns

### Data Flow Verification

```powershell
# 1. Check Prometheus has metrics
kubectl -n monitoring port-forward svc/prometheus-server 9090:80 &
# Visit: http://localhost:9090/graph
# Query: container_cpu_usage_seconds_total

# 2. Check OpenCost has cost data
kubectl -n opencost port-forward svc/opencost 9003:9003 &
curl http://localhost:9003/allocation/compute

# 3. Check KubeCent backend processes data
curl "http://${KUBECENT_URL}/api/v1/costs/cluster"

# 4. Check Frontend displays data
Start-Process "http://${KUBECENT_URL}"
```

---

## 🧹 Phase 9: Cleanup (Optional)

**When you're done testing and want to remove everything:**

```powershell
# Delete KubeCent
helm uninstall kubecent -n kubecent
kubectl delete namespace kubecent

# Delete test workloads
kubectl delete namespace test-workload
1..3 | ForEach-Object { kubectl delete namespace "app-env-$_" }

# Delete OpenCost
helm uninstall opencost -n opencost
kubectl delete namespace opencost

# Delete Prometheus
helm uninstall prometheus -n monitoring
kubectl delete namespace monitoring

# Delete EKS cluster (this deletes everything)
eksctl delete cluster --name $CLUSTER_NAME --region $AWS_REGION --wait

# Delete ECR repositories
aws ecr delete-repository --repository-name kubecent-backend --region $AWS_REGION --force
aws ecr delete-repository --repository-name kubecent-frontend --region $AWS_REGION --force
```

**⚠️ Warning:** This will delete everything and stop all charges!

---

## 📝 Quick Reference Commands

### Check Status
```powershell
# Cluster info
kubectl cluster-info
kubectl get nodes

# All pods
kubectl get pods -A

# KubeCent status
kubectl -n kubecent get all

# Logs
kubectl -n kubecent logs -l app=kubecent-backend --tail=100
```

### Access Points
```powershell
# Get LoadBalancer URL
kubectl -n kubecent get svc kubecent-frontend

# Port forward (local testing)
kubectl -n kubecent port-forward svc/kubecent-frontend 8080:80
# Then visit: http://localhost:8080
```

### Troubleshooting
```powershell
# Check pod status
kubectl -n kubecent describe pod <pod-name>

# Check logs
kubectl -n kubecent logs <pod-name> -c backend

# Restart deployment
kubectl -n kubecent rollout restart deployment kubecent-backend
kubectl -n kubecent rollout restart deployment kubecent-frontend

# Check events
kubectl -n kubecent get events --sort-by='.lastTimestamp'
```

### Cost Data
```powershell
$url = (kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Cluster costs
curl "http://${url}/api/v1/costs/cluster"

# Namespace costs
curl "http://${url}/api/v1/costs/namespaces"

# Pod costs
curl "http://${url}/api/v1/costs/pods?namespace=default"

# Optimizations
curl "http://${url}/api/v1/optimizations/report"
```

---

## 🎓 What You've Learned

After completing all phases, you now have:

✅ A fully functional EKS cluster on AWS  
✅ Real-time cost monitoring for all workloads  
✅ Optimization recommendations based on actual usage  
✅ Production-ready deployment using Helm  
✅ Understanding of Kubernetes cost management  
✅ Hands-on experience with AWS, Docker, Kubernetes, and Helm

---

## 📞 Next Steps

1. **Explore the Dashboard:** Spend time understanding different views
2. **Deploy Real Applications:** Replace test workloads with your actual apps
3. **Set Cost Budgets:** Define acceptable cost ranges per namespace
4. **Automate Reporting:** Use the API to generate daily/weekly cost reports
5. **Integrate with CI/CD:** Add cost checks to your deployment pipeline
6. **Scale Testing:** Test with more namespaces and workloads

---

## 💡 Pro Tips

- **Cost Accuracy:** Wait 10-15 minutes after deploying workloads for accurate costs
- **Resource Limits:** Always set resource limits for accurate cost allocation
- **Regular Reviews:** Check optimization recommendations weekly
- **Tag Namespaces:** Use labels for better cost categorization
- **Monitor Trends:** Look at daily/weekly trends, not just current costs
- **Act on Recommendations:** Implement at least top 3 optimizations monthly

---

## 📚 Additional Resources

- **AWS EKS Documentation:** https://docs.aws.amazon.com/eks/
- **OpenCost Documentation:** https://www.opencost.io/docs/
- **Prometheus Documentation:** https://prometheus.io/docs/
- **Helm Documentation:** https://helm.sh/docs/
- **KubeCent API Reference:** [API_QUICKREF.md](./API_QUICKREF.md)

---

**🎉 Congratulations!** You've successfully deployed a production-ready cost optimization platform on AWS EKS!
