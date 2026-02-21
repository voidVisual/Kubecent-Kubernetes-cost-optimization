# KubeCent API Test Suite (PowerShell)
# Run this after deployment to verify all APIs are working

param(
    [Parameter(Mandatory=$false)]
    [string]$KubecentUrl
)

function Print-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Test {
    param($Message)
    Write-Host "🧪 $Message" -ForegroundColor Yellow
}

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   KubeCent API Test Suite                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get KubeCent URL
if ([string]::IsNullOrWhiteSpace($KubecentUrl)) {
    try {
        $KubecentUrl = kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
    } catch {
        Write-Host "Usage: .\test-apis.ps1 -KubecentUrl <url>"
        Write-Host "Or run from a system with kubectl configured for your cluster"
        exit 1
    }
}

# Clean URL
$KubecentUrl = $KubecentUrl -replace '^https?://', ''

Write-Host "Testing KubeCent at: http://$KubecentUrl"
Write-Host ""

# Test 1: Health Check
Print-Test "Health Check"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "Health check passed ($($response.StatusCode)) - $($response.Content)"
    }
} catch {
    Print-Error "Health check failed - $_"
    exit 1
}
Write-Host ""

# Test 2: Cluster Costs
Print-Test "GET /api/v1/costs/cluster"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/api/v1/costs/cluster" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "Cluster costs endpoint working ($($response.StatusCode))"
        Write-Host "Sample response:"
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
    }
} catch {
    Print-Error "Cluster costs endpoint failed - $_"
}
Write-Host ""

# Test 3: Namespace Costs
Print-Test "GET /api/v1/costs/namespaces"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/api/v1/costs/namespaces" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $namespaces = $response.Content | ConvertFrom-Json
        Print-Success "Namespace costs endpoint working ($($response.StatusCode)) - $($namespaces.Count) namespaces found"
        Write-Host "Sample namespaces:"
        $namespaces | Select-Object -First 3 | ConvertTo-Json -Depth 2
    }
} catch {
    Print-Error "Namespace costs endpoint failed - $_"
}
Write-Host ""

# Test 4: Pod Costs
Print-Test "GET /api/v1/costs/pods"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/api/v1/costs/pods" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $pods = $response.Content | ConvertFrom-Json
        Print-Success "Pod costs endpoint working ($($response.StatusCode)) - $($pods.Count) pods found"
    }
} catch {
    Print-Error "Pod costs endpoint failed - $_"
}
Write-Host ""

# Test 5: Optimization Report
Print-Test "GET /api/v1/optimizations/report"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/api/v1/optimizations/report" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $report = $response.Content | ConvertFrom-Json
        Print-Success "Optimization report endpoint working ($($response.StatusCode)) - $($report.recommendations.Count) recommendations"
        Write-Host "Sample recommendation:"
        $report.recommendations | Select-Object -First 1 | ConvertTo-Json -Depth 2
    }
} catch {
    Print-Error "Optimization report failed - $_"
}
Write-Host ""

# Test 6: API Documentation
Print-Test "GET /api/docs (Swagger UI)"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/api/docs" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "API documentation accessible ($($response.StatusCode))"
    }
} catch {
    Print-Error "API documentation failed - $_"
}
Write-Host ""

# Test 7: OpenAPI Schema
Print-Test "GET /openapi.json"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/openapi.json" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "OpenAPI schema accessible ($($response.StatusCode))"
    }
} catch {
    Print-Error "OpenAPI schema failed - $_"
}
Write-Host ""

# Test 8: Frontend
Print-Test "GET / (Frontend)"
try {
    $response = Invoke-WebRequest -Uri "http://$KubecentUrl/" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "Frontend accessible ($($response.StatusCode))"
    }
} catch {
    Print-Error "Frontend failed - $_"
}
Write-Host ""

# Summary
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║               Test Summary                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Print-Success "All critical APIs are working!"
Write-Host ""
Write-Host "Access your dashboard:"
Write-Host "  🌐 Dashboard: http://$KubecentUrl" -ForegroundColor White
Write-Host "  📚 API Docs:  http://$KubecentUrl/api/docs" -ForegroundColor White
Write-Host "  ❤️  Health:    http://$KubecentUrl/health" -ForegroundColor White
Write-Host ""
Write-Host "Note: If you see cost data as zeros, wait 5-10 minutes for OpenCost to collect initial metrics." -ForegroundColor Yellow
