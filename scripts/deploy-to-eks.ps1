# KubeCent - AWS EKS Deployment Script (PowerShell)
# This script automates the entire deployment process for Windows users

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   KubeCent - AWS EKS Deployment Script        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

function Print-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Yellow
}

# Step 1: Validate prerequisites
Write-Host "Step 1: Validating prerequisites..." -ForegroundColor Cyan
$commands = @("aws", "kubectl", "helm", "docker")
foreach ($cmd in $commands) {
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Print-Error "$cmd not found. Please install it first."
        exit 1
    }
}
Print-Success "All prerequisites installed"

# Step 2: Get AWS configuration
Write-Host ""
Write-Host "Step 2: AWS Configuration" -ForegroundColor Cyan
$AWS_REGION = Read-Host "Enter your AWS region (default: us-east-1)"
if ([string]::IsNullOrWhiteSpace($AWS_REGION)) {
    $AWS_REGION = "us-east-1"
}

$CLUSTER_NAME = Read-Host "Enter your EKS cluster name"
if ([string]::IsNullOrWhiteSpace($CLUSTER_NAME)) {
    Print-Error "Cluster name is required"
    exit 1
}

# Get AWS account ID
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
Print-Info "AWS Account ID: $AWS_ACCOUNT_ID"
Print-Info "AWS Region: $AWS_REGION"
Print-Info "EKS Cluster: $CLUSTER_NAME"

# Step 3: Connect to EKS cluster
Write-Host ""
Write-Host "Step 3: Connecting to EKS cluster..." -ForegroundColor Cyan
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
kubectl cluster-info
Print-Success "Connected to EKS cluster"

# Step 4: Install Prometheus
Write-Host ""
Write-Host "Step 4: Installing Prometheus..." -ForegroundColor Cyan
$namespaceExists = kubectl get namespace monitoring 2>$null
if ($namespaceExists) {
    Print-Info "Namespace 'monitoring' already exists, skipping Prometheus installation"
} else {
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm install prometheus prometheus-community/prometheus `
      --namespace monitoring `
      --create-namespace `
      --set server.persistentVolume.enabled=false `
      --set alertmanager.persistentVolume.enabled=false `
      --wait `
      --timeout 5m
    
    Print-Success "Prometheus installed successfully"
}

kubectl -n monitoring wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus --timeout=300s
Print-Success "Prometheus is ready"

# Step 5: Install OpenCost
Write-Host ""
Write-Host "Step 5: Installing OpenCost..." -ForegroundColor Cyan
$namespaceExists = kubectl get namespace opencost 2>$null
if ($namespaceExists) {
    Print-Info "Namespace 'opencost' already exists, skipping OpenCost installation"
} else {
    helm repo add opencost https://opencost.github.io/opencost-helm-chart
    helm repo update
    
    helm install opencost opencost/opencost `
      --namespace opencost `
      --create-namespace `
      --set opencost.exporter.defaultClusterId=$CLUSTER_NAME `
      --set opencost.prometheus.external.url=http://prometheus-server.monitoring.svc.cluster.local:9090 `
      --wait `
      --timeout 5m
    
    Print-Success "OpenCost installed successfully"
}

kubectl -n opencost wait --for=condition=ready pod -l app.kubernetes.io/name=opencost --timeout=300s
Print-Success "OpenCost is ready"

# Step 6: Create ECR repositories
Write-Host ""
Write-Host "Step 6: Creating ECR repositories..." -ForegroundColor Cyan
try {
    aws ecr describe-repositories --repository-names kubecent-backend --region $AWS_REGION 2>$null
} catch {
    aws ecr create-repository --repository-name kubecent-backend --region $AWS_REGION
}
Print-Success "ECR repository 'kubecent-backend' ready"

try {
    aws ecr describe-repositories --repository-names kubecent-frontend --region $AWS_REGION 2>$null
} catch {
    aws ecr create-repository --repository-name kubecent-frontend --region $AWS_REGION
}
Print-Success "ECR repository 'kubecent-frontend' ready"

# Step 7: Login to ECR
Write-Host ""
Write-Host "Step 7: Logging into ECR..." -ForegroundColor Cyan
$ecrPassword = aws ecr get-login-password --region $AWS_REGION
$ecrPassword | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
Print-Success "Logged into ECR"

# Step 8: Build and push Docker images
Write-Host ""
Write-Host "Step 8: Building and pushing Docker images..." -ForegroundColor Cyan
Print-Info "This may take 5-10 minutes..."

$VERSION = "v1.0.0"

# Build backend
Print-Info "Building backend image..."
docker build -f docker/Dockerfile.backend `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:$VERSION" `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest" `
  .

# Push backend
Print-Info "Pushing backend image..."
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:$VERSION"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest"
Print-Success "Backend image pushed"

# Build frontend
Print-Info "Building frontend image..."
docker build -f docker/Dockerfile.frontend `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:$VERSION" `
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest" `
  .

# Push frontend
Print-Info "Pushing frontend image..."
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:$VERSION"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest"
Print-Success "Frontend image pushed"

# Step 9: Deploy KubeCent
Write-Host ""
Write-Host "Step 9: Deploying KubeCent to EKS..." -ForegroundColor Cyan
helm install kubecent ./helm/kubecent `
  --namespace kubecent `
  --create-namespace `
  --set image.backend.repository="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend" `
  --set image.backend.tag=$VERSION `
  --set image.frontend.repository="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend" `
  --set image.frontend.tag=$VERSION `
  --set opencost.url=http://opencost.opencost.svc.cluster.local:9003 `
  --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local:9090 `
  --set service.type=LoadBalancer `
  --wait `
  --timeout 5m

Print-Success "KubeCent deployed successfully"

# Step 10: Wait for pods to be ready
Write-Host ""
Write-Host "Step 10: Waiting for pods to be ready..." -ForegroundColor Cyan
kubectl -n kubecent wait --for=condition=ready pod -l app=kubecent --timeout=300s
Print-Success "All pods are ready"

# Step 11: Get access information
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Deployment Successful! 🎉             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Print-Info "Waiting for LoadBalancer to be provisioned (this may take 2-3 minutes)..."

# Wait for LoadBalancer
$KUBECENT_URL = ""
for ($i = 1; $i -le 60; $i++) {
    $KUBECENT_URL = kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
    if (![string]::IsNullOrWhiteSpace($KUBECENT_URL)) {
        break
    }
    Start-Sleep -Seconds 5
    Write-Host -NoNewline "."
}
Write-Host ""

if ([string]::IsNullOrWhiteSpace($KUBECENT_URL)) {
    Print-Error "LoadBalancer URL not available yet. Please run:"
    Write-Host "kubectl -n kubecent get svc kubecent-frontend"
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Print-Success "Access your KubeCent dashboard at:"
    Write-Host ""
    Write-Host "    🌐  http://$KUBECENT_URL" -ForegroundColor White
    Write-Host ""
    Print-Success "API Documentation:"
    Write-Host "    📚  http://$KUBECENT_URL/api/docs" -ForegroundColor White
    Write-Host ""
    Print-Success "Health Check:"
    Write-Host "    ❤️  http://$KUBECENT_URL/health" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
}

# Step 12: Verify installation
Write-Host ""
Write-Host "Step 12: Verifying installation..." -ForegroundColor Cyan
kubectl -n kubecent get pods
kubectl -n kubecent get svc

Write-Host ""
Print-Info "Deployment complete! Run these commands to verify:"
Write-Host ""
Write-Host "# View logs" -ForegroundColor Yellow
Write-Host "kubectl -n kubecent logs -l app=kubecent -f"
Write-Host ""
Write-Host "# Check health" -ForegroundColor Yellow
Write-Host "curl http://$KUBECENT_URL/health"
Write-Host ""
Write-Host "# Test API" -ForegroundColor Yellow
Write-Host "curl http://$KUBECENT_URL/api/v1/costs/cluster"
Write-Host ""

Print-Success "Setup completed successfully!"
