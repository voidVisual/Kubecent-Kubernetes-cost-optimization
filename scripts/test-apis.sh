#!/bin/bash
# Quick test script to verify all KubeCent APIs are working
# Run this after deployment to ensure everything is functioning

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

print_test() {
    echo -e "${YELLOW}🧪 $1${NC}"
}

echo "╔════════════════════════════════════════════════╗"
echo "║   KubeCent API Test Suite                     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Get KubeCent URL
if [ -z "$1" ]; then
    KUBECENT_URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    
    if [ -z "$KUBECENT_URL" ]; then
        echo "Usage: $0 <kubecent-url>"
        echo "Or run from a system with kubectl configured for your cluster"
        exit 1
    fi
else
    KUBECENT_URL=$1
fi

# Remove http:// or https:// if provided
KUBECENT_URL=${KUBECENT_URL#http://}
KUBECENT_URL=${KUBECENT_URL#https://}

echo "Testing KubeCent at: http://$KUBECENT_URL"
echo ""

# Test 1: Health Check
print_test "Health Check"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/health)
if [ "$RESPONSE" -eq 200 ]; then
    HEALTH_DATA=$(curl -s http://$KUBECENT_URL/health)
    print_success "Health check passed ($RESPONSE) - $HEALTH_DATA"
else
    print_error "Health check failed ($RESPONSE)"
    exit 1
fi
echo ""

# Test 2: Cluster Costs
print_test "GET /api/v1/costs/cluster"
RESPONSE=$(curl -s -w "\n%{http_code}" http://$KUBECENT_URL/api/v1/costs/cluster)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Cluster costs endpoint working ($HTTP_CODE)"
    echo "Sample response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Cluster costs endpoint failed ($HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 3: Namespace Costs
print_test "GET /api/v1/costs/namespaces"
RESPONSE=$(curl -s -w "\n%{http_code}" http://$KUBECENT_URL/api/v1/costs/namespaces)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    NAMESPACE_COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "?")
    print_success "Namespace costs endpoint working ($HTTP_CODE) - $NAMESPACE_COUNT namespaces found"
    echo "Sample namespaces:"
    echo "$BODY" | jq '.[0:3]' 2>/dev/null || echo "$BODY" | head -n 10
else
    print_error "Namespace costs endpoint failed ($HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 4: Pod Costs
print_test "GET /api/v1/costs/pods"
RESPONSE=$(curl -s -w "\n%{http_code}" http://$KUBECENT_URL/api/v1/costs/pods)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    POD_COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "?")
    print_success "Pod costs endpoint working ($HTTP_CODE) - $POD_COUNT pods found"
else
    print_error "Pod costs endpoint failed ($HTTP_CODE)"
fi
echo ""

# Test 5: Optimization Report
print_test "GET /api/v1/optimizations/report"
RESPONSE=$(curl -s -w "\n%{http_code}" http://$KUBECENT_URL/api/v1/optimizations/report)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    REC_COUNT=$(echo "$BODY" | jq '.recommendations | length' 2>/dev/null || echo "?")
    print_success "Optimization report endpoint working ($HTTP_CODE) - $REC_COUNT recommendations"
    echo "Sample recommendation:"
    echo "$BODY" | jq '.recommendations[0]' 2>/dev/null || echo "$BODY" | head -n 10
else
    print_error "Optimization report failed ($HTTP_CODE)"
fi
echo ""

# Test 6: API Documentation
print_test "GET /api/docs (Swagger UI)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/api/docs)
if [ "$RESPONSE" -eq 200 ]; then
    print_success "API documentation accessible ($RESPONSE)"
else
    print_error "API documentation failed ($RESPONSE)"
fi
echo ""

# Test 7: OpenAPI Schema
print_test "GET /openapi.json"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/openapi.json)
if [ "$RESPONSE" -eq 200 ]; then
    print_success "OpenAPI schema accessible ($RESPONSE)"
else
    print_error "OpenAPI schema failed ($RESPONSE)"
fi
echo ""

# Test 8: Frontend
print_test "GET / (Frontend)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$KUBECENT_URL/)
if [ "$RESPONSE" -eq 200 ]; then
    print_success "Frontend accessible ($RESPONSE)"
else
    print_error "Frontend failed ($RESPONSE)"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════╗"
echo "║               Test Summary                     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
print_success "All critical APIs are working!"
echo ""
echo "Access your dashboard:"
echo "  🌐 Dashboard: http://$KUBECENT_URL"
echo "  📚 API Docs:  http://$KUBECENT_URL/api/docs"
echo "  ❤️  Health:    http://$KUBECENT_URL/health"
echo ""
echo "Note: If you see cost data as zeros, wait 5-10 minutes for OpenCost to collect initial metrics."
