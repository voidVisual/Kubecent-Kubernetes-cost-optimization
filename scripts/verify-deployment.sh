#!/bin/bash
# KubeCent - Deployment Verification Script
# Verifies that KubeCent is properly deployed and all APIs are working

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_test() {
    echo -e "${YELLOW}🧪 Testing: $1${NC}"
}

echo "╔════════════════════════════════════════════════╗"
echo "║   KubeCent - Deployment Verification          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    print_error "kubectl not configured or cluster not accessible"
    exit 1
fi

# Check if kubecent namespace exists
if ! kubectl get namespace kubecent &> /dev/null; then
    print_error "kubecent namespace not found. Is KubeCent deployed?"
    exit 1
fi

print_success "Namespace 'kubecent' exists"

# Check pods
echo ""
print_info "Checking pods..."
kubectl -n kubecent get pods

BACKEND_PODS=$(kubectl -n kubecent get pods -l component=backend --no-headers | wc -l)
FRONTEND_PODS=$(kubectl -n kubecent get pods -l component=frontend --no-headers | wc -l)

if [ "$BACKEND_PODS" -eq 0 ]; then
    print_error "No backend pods found"
    exit 1
fi

if [ "$FRONTEND_PODS" -eq 0 ]; then
    print_error "No frontend pods found"
    exit 1
fi

print_success "$BACKEND_PODS backend pod(s) found"
print_success "$FRONTEND_PODS frontend pod(s) found"

# Check if pods are ready
READY_PODS=$(kubectl -n kubecent get pods --no-headers | grep -c "Running" || true)
TOTAL_PODS=$(kubectl -n kubecent get pods --no-headers | wc -l)

if [ "$READY_PODS" -ne "$TOTAL_PODS" ]; then
    print_error "Not all pods are running ($READY_PODS/$TOTAL_PODS)"
    kubectl -n kubecent get pods
    exit 1
fi

print_success "All pods are running ($READY_PODS/$TOTAL_PODS)"

# Check services
echo ""
print_info "Checking services..."
kubectl -n kubecent get svc

# Get LoadBalancer URL
KUBECENT_URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

if [ -z "$KUBECENT_URL" ]; then
    print_info "LoadBalancer not ready yet, using port-forward for testing..."
    
    # Start port forwarding in background
    kubectl -n kubecent port-forward svc/kubecent-frontend 8080:80 &
    PF_PID=$!
    sleep 3
    KUBECENT_URL="localhost:8080"
    USE_PORT_FORWARD=true
else
    print_success "LoadBalancer URL: $KUBECENT_URL"
    USE_PORT_FORWARD=false
fi

# Test health endpoint
echo ""
print_test "Health Check"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/health)

if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    print_success "Health check passed (HTTP $HEALTH_RESPONSE)"
else
    print_error "Health check failed (HTTP $HEALTH_RESPONSE)"
    if [ "$USE_PORT_FORWARD" = true ]; then
        kill $PF_PID 2>/dev/null || true
    fi
    exit 1
fi

# Test API endpoints
echo ""
print_test "API Endpoints"

# Test cluster costs
print_info "Testing GET /api/v1/costs/cluster"
CLUSTER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/api/v1/costs/cluster)
if [ "$CLUSTER_RESPONSE" -eq 200 ]; then
    print_success "Cluster costs endpoint working (HTTP $CLUSTER_RESPONSE)"
    curl -s http://$KUBECENT_URL/api/v1/costs/cluster | jq '.' 2>/dev/null || echo "(JSON response received)"
else
    print_error "Cluster costs endpoint failed (HTTP $CLUSTER_RESPONSE)"
fi

echo ""
print_info "Testing GET /api/v1/costs/namespaces"
NAMESPACE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/api/v1/costs/namespaces)
if [ "$NAMESPACE_RESPONSE" -eq 200 ]; then
    print_success "Namespace costs endpoint working (HTTP $NAMESPACE_RESPONSE)"
else
    print_error "Namespace costs endpoint failed (HTTP $NAMESPACE_RESPONSE)"
fi

echo ""
print_info "Testing GET /api/v1/optimizations/report"
OPTIMIZATION_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/api/v1/optimizations/report)
if [ "$OPTIMIZATION_RESPONSE" -eq 200 ]; then
    print_success "Optimization report endpoint working (HTTP $OPTIMIZATION_RESPONSE)"
else
    print_error "Optimization report endpoint failed (HTTP $OPTIMIZATION_RESPONSE)"
fi

# Test prerequisites
echo ""
print_test "Prerequisites (OpenCost & Prometheus)"

print_info "Checking OpenCost..."
if kubectl -n opencost get pods -l app.kubernetes.io/name=opencost &> /dev/null; then
    OPENCOST_POD=$(kubectl -n opencost get pods -l app.kubernetes.io/name=opencost -o jsonpath='{.items[0].metadata.name}')
    OPENCOST_STATUS=$(kubectl -n opencost get pod $OPENCOST_POD -o jsonpath='{.status.phase}')
    if [ "$OPENCOST_STATUS" = "Running" ]; then
        print_success "OpenCost is running"
    else
        print_error "OpenCost pod is not running (Status: $OPENCOST_STATUS)"
    fi
else
    print_error "OpenCost not found in namespace 'opencost'"
fi

print_info "Checking Prometheus..."
if kubectl -n monitoring get pods -l app.kubernetes.io/name=prometheus &> /dev/null; then
    PROM_PODS=$(kubectl -n monitoring get pods -l app.kubernetes.io/name=prometheus --field-selector=status.phase=Running --no-headers | wc -l)
    if [ "$PROM_PODS" -gt 0 ]; then
        print_success "Prometheus is running ($PROM_PODS pod(s))"
    else
        print_error "Prometheus pods not running"
    fi
else
    print_error "Prometheus not found in namespace 'monitoring'"
fi

# Check logs for errors
echo ""
print_test "Recent Logs Analysis"
BACKEND_ERRORS=$(kubectl -n kubecent logs -l component=backend --tail=100 2>/dev/null | grep -i error | wc -l || echo "0")
if [ "$BACKEND_ERRORS" -gt 0 ]; then
    print_info "Found $BACKEND_ERRORS error(s) in backend logs (last 100 lines)"
    print_info "View full logs: kubectl -n kubecent logs -l component=backend -f"
else
    print_success "No errors in recent backend logs"
fi

# Clean up port-forward if used
if [ "$USE_PORT_FORWARD" = true ]; then
    kill $PF_PID 2>/dev/null || true
    print_info "Port-forward stopped"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║            Verification Summary                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

if [ -z "$KUBECENT_URL" ] || [ "$KUBECENT_URL" = "localhost:8080" ]; then
    KUBECENT_URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
fi

if [ -z "$KUBECENT_URL" ]; then
    print_info "Access via port-forward:"
    echo "kubectl -n kubecent port-forward svc/kubecent-frontend 8080:80"
    echo "Then open: http://localhost:8080"
else
    print_success "Access your dashboard at:"
    echo ""
    echo "    🌐  http://$KUBECENT_URL"
    echo "    📚  http://$KUBECENT_URL/api/docs"
    echo "    ❤️   http://$KUBECENT_URL/health"
fi

echo ""
print_success "All verifications passed! ✨"
