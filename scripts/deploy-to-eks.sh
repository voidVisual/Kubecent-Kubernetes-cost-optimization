#!/bin/bash
# KubeCent - AWS EKS Deployment Script
# This script automates the entire deployment process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════╗"
echo "║   KubeCent - AWS EKS Deployment Script        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Validate prerequisites
echo "Step 1: Validating prerequisites..."
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install it first."
    exit 1
fi

if ! command -v helm &> /dev/null; then
    print_error "Helm not found. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install it first."
    exit 1
fi

print_success "All prerequisites installed"

# Step 2: Get AWS configuration
echo ""
echo "Step 2: AWS Configuration"
read -p "Enter your AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Enter your EKS cluster name: " CLUSTER_NAME
if [ -z "$CLUSTER_NAME" ]; then
    print_error "Cluster name is required"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_info "AWS Account ID: $AWS_ACCOUNT_ID"
print_info "AWS Region: $AWS_REGION"
print_info "EKS Cluster: $CLUSTER_NAME"

# Step 3: Connect to EKS cluster
echo ""
echo "Step 3: Connecting to EKS cluster..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
kubectl cluster-info
print_success "Connected to EKS cluster"

# Step 4: Install Prometheus
echo ""
echo "Step 4: Installing Prometheus..."
if kubectl get namespace monitoring &> /dev/null; then
    print_info "Namespace 'monitoring' already exists, skipping Prometheus installation"
else
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm install prometheus prometheus-community/prometheus \
      --namespace monitoring \
      --create-namespace \
      --set server.persistentVolume.enabled=false \
      --set alertmanager.persistentVolume.enabled=false \
      --wait \
      --timeout 5m
    
    print_success "Prometheus installed successfully"
fi

# Verify Prometheus is running
kubectl -n monitoring wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus --timeout=300s
print_success "Prometheus is ready"

# Step 5: Install OpenCost
echo ""
echo "Step 5: Installing OpenCost..."
if kubectl get namespace opencost &> /dev/null; then
    print_info "Namespace 'opencost' already exists, skipping OpenCost installation"
else
    helm repo add opencost https://opencost.github.io/opencost-helm-chart
    helm repo update
    
    helm install opencost opencost/opencost \
      --namespace opencost \
      --create-namespace \
      --set opencost.exporter.defaultClusterId=$CLUSTER_NAME \
      --set opencost.prometheus.external.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
      --wait \
      --timeout 5m
    
    print_success "OpenCost installed successfully"
fi

# Verify OpenCost is running
kubectl -n opencost wait --for=condition=ready pod -l app.kubernetes.io/name=opencost --timeout=300s
print_success "OpenCost is ready"

# Step 6: Create ECR repositories
echo ""
echo "Step 6: Creating ECR repositories..."
aws ecr describe-repositories --repository-names kubecent-backend --region $AWS_REGION &> /dev/null || \
    aws ecr create-repository --repository-name kubecent-backend --region $AWS_REGION
print_success "ECR repository 'kubecent-backend' ready"

aws ecr describe-repositories --repository-names kubecent-frontend --region $AWS_REGION &> /dev/null || \
    aws ecr create-repository --repository-name kubecent-frontend --region $AWS_REGION
print_success "ECR repository 'kubecent-frontend' ready"

# Step 7: Login to ECR
echo ""
echo "Step 7: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
print_success "Logged into ECR"

# Step 8: Build and push Docker images
echo ""
echo "Step 8: Building and pushing Docker images..."
print_info "This may take 5-10 minutes..."

VERSION="v1.0.0"

# Build backend
print_info "Building backend image..."
docker build -f docker/Dockerfile.backend \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:$VERSION \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest \
  .

# Push backend
print_info "Pushing backend image..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:$VERSION
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest
print_success "Backend image pushed"

# Build frontend
print_info "Building frontend image..."
docker build -f docker/Dockerfile.frontend \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:$VERSION \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest \
  .

# Push frontend
print_info "Pushing frontend image..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:$VERSION
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest
print_success "Frontend image pushed"

# Step 9: Deploy KubeCent
echo ""
echo "Step 9: Deploying KubeCent to EKS..."
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace \
  --set image.backend.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend \
  --set image.backend.tag=$VERSION \
  --set image.frontend.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend \
  --set image.frontend.tag=$VERSION \
  --set opencost.url=http://opencost.opencost.svc.cluster.local:9003 \
  --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
  --set service.type=LoadBalancer \
  --wait \
  --timeout 5m

print_success "KubeCent deployed successfully"

# Step 10: Wait for pods to be ready
echo ""
echo "Step 10: Waiting for pods to be ready..."
kubectl -n kubecent wait --for=condition=ready pod -l app=kubecent --timeout=300s
print_success "All pods are ready"

# Step 11: Get access information
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║          Deployment Successful! 🎉             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
print_info "Waiting for LoadBalancer to be provisioned (this may take 2-3 minutes)..."

# Wait for LoadBalancer
for i in {1..60}; do
    KUBECENT_URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    if [ ! -z "$KUBECENT_URL" ]; then
        break
    fi
    sleep 5
    echo -n "."
done
echo ""

if [ -z "$KUBECENT_URL" ]; then
    print_error "LoadBalancer URL not available yet. Please run:"
    echo "kubectl -n kubecent get svc kubecent-frontend"
else
    echo ""
    echo "═══════════════════════════════════════════════"
    print_success "Access your KubeCent dashboard at:"
    echo ""
    echo "    🌐  http://$KUBECENT_URL"
    echo ""
    print_success "API Documentation:"
    echo "    📚  http://$KUBECENT_URL/api/docs"
    echo ""
    print_success "Health Check:"
    echo "    ❤️  http://$KUBECENT_URL/health"
    echo "═══════════════════════════════════════════════"
fi

# Step 12: Verify installation
echo ""
echo "Step 12: Verifying installation..."
kubectl -n kubecent get pods
kubectl -n kubecent get svc

echo ""
print_info "Deployment complete! Run these commands to verify:"
echo ""
echo "# View logs"
echo "kubectl -n kubecent logs -l app=kubecent -f"
echo ""
echo "# Check health"
echo "curl http://\$KUBECENT_URL/health"
echo ""
echo "# Test API"
echo "curl http://\$KUBECENT_URL/api/v1/costs/cluster"
echo ""

print_success "Setup completed successfully!"
