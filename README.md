# Kubecent - Kubernetes Cost Optimization Platform

> An in-cluster, lightweight alternative to Kubecost for Kubernetes cost optimization

## Overview

Kubecent is a self-hosted, production-ready platform for understanding and optimizing Kubernetes costs within your cluster. It integrates seamlessly with OpenCost and Prometheus without requiring external data export or SaaS dependencies.

**Key Features:**
- **In-Cluster Only**: Runs entirely within your Kubernetes cluster
- **Cost Visibility**: Real-time cost allocation by namespace, pod, and container
- **Optimization Insights**: AI-powered recommendations for cost reduction
- **Kubernetes RBAC**: Native integration with Kubernetes service accounts
- **Beautiful UI**: Modern React dashboard with real-time data
- **Grafana Monitoring**: Integrated monitoring dashboards for comprehensive metrics
- **Container Native**: Docker and Helm deployment ready
- **Production Ready**: Clean architecture, comprehensive logging, security best practices
- **AWS EKS Ready**: Automated deployment scripts for Amazon EKS

## Quick Deploy to AWS EKS

**Deploy KubeCent to your AWS EKS cluster in 15 minutes!**

```bash
# For Windows PowerShell
.\scripts\deploy-to-eks.ps1

# For Linux/Mac
./scripts/deploy-to-eks.sh
```

See **[Quick Deploy Guide](./QUICK_DEPLOY.md)** for one-command deployment!

## Documentation

### Getting Started
- **[ Quick Deploy (AWS EKS)](./QUICK_DEPLOY.md)** - One-command deployment
- **[ AWS EKS Deployment Guide](./AWS_EKS_DEPLOYMENT.md)** - Complete AWS EKS setup
- **[ Quick Start Guide](./QUICKSTART.md)** - Local development setup

### Deployment & Operations
- **[ Deployment Guide](./DEPLOYMENT.md)** - General Kubernetes deployment
- **[ Grafana Setup Guide](./GRAFANA_SETUP.md)** - Set up monitoring dashboards
- **[ Grafana Integration](./GRAFANA_MONITORING_INTEGRATION.md)** - Implementation details

### Reference
- **[ API Reference](./API_QUICKREF.md)** - Backend API documentation

## Architecture

### Backend (FastAPI)
- **Clean Architecture**: Separated concerns (API, Services, Models, Middleware)
- **Kubernetes Integration**: Native RBAC auth via service account tokens
- **OpenCost Client**: Aggregates cost allocation data
- **Grafana Integration**: Health checks and dashboard connectivity
- **Structured Logging**: JSON logging for production observability
- **Prometheus Metrics**: Built-in metrics export

### Frontend (React + Vite)
- **TypeScript**: Fully typed components for safety
- **Tailwind CSS**: Modern, responsive design
- **Recharts**: Interactive cost visualizations
- **API Client**: Abstracted HTTP layer with error handling
- **Custom Hooks**: Reusable data fetching logic

## Quick Start

### Prerequisites
- Kubernetes 1.20+
- OpenCost installed and running
- Prometheus configured
- (Optional) Grafana for monitoring dashboards
- Docker (for local development)
- Node.js 18+ and Python 3.11+ (for local development)

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export OPENCOST_URL=http://localhost:9003
python -m uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

The UI will be available at http://localhost:5173

### Docker Compose (Development)
```bash
docker-compose -f docker/docker-compose.yml up
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Prometheus: http://localhost:9090
- OpenCost: http://localhost:9003

## Kubernetes Deployment

### AWS EKS (Recommended)

**Automated deployment with one command:**

```bash
# Windows PowerShell
.\scripts\deploy-to-eks.ps1

# Linux/Mac
./scripts/deploy-to-eks.sh
```

This will automatically:
- Install Prometheus & OpenCost
- Build and push Docker images to ECR
- Deploy KubeCent with LoadBalancer
- Provide access URL

**Manual deployment:**
See **[AWS EKS Deployment Guide](./AWS_EKS_DEPLOYMENT.md)** for detailed step-by-step instructions.

### Using Helm (Any Kubernetes Cluster)

#### Standard Installation
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace \
  --values helm/kubecent/values.yaml
```

#### With Grafana Monitoring (Recommended)
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace \
  --values helm/kubecent/values-monitoring.yaml \
  --set monitoring.enabled=true
```

See [GRAFANA_SETUP.md](./GRAFANA_SETUP.md) for complete monitoring setup instructions.

### Access the UI
```bash
# Get LoadBalancer URL (AWS EKS)
kubectl -n kubecent get svc kubecent-frontend

# Via Port Forward (development)
kubectl port-forward -n kubecent svc/kubecent-frontend 3000:80

# Via Ingress (if configured)
# Update values.yaml to enable ingress
```

### Verify Installation
```bash
# Run verification script
./scripts/verify-deployment.sh

# Or manually
kubectl -n kubecent get pods
kubectl -n kubecent logs -f deployment/kubecent-backend
```

## API Endpoints

### Cost Queries
- `GET /api/v1/costs/cluster` - Cluster-wide costs
- `GET /api/v1/costs/namespaces` - Costs by namespace
- `GET /api/v1/costs/pods?namespace=<ns>` - Costs by pod

### Optimization
- `GET /api/v1/optimizations/report` - Recommendations

### Grafana Integration
- `GET /api/v1/grafana/health` - Grafana connection status
- `GET /api/v1/grafana/dashboards` - Available dashboards
- `GET /api/v1/grafana/links` - Dashboard links

### Health
- `GET /health` - Application health check
- `GET /metrics` - Prometheus metrics

## Configuration

### Environment Variables (Backend)

```env
# OpenCost
OPENCOST_URL=http://opencost:9003
OPENCOST_TIMEOUT=30

# Prometheus
PROMETHEUS_URL=http://prometheus:9090

# Grafana (Optional - for monitoring dashboards)
GRAFANA_URL=http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local
GRAFANA_API_KEY=  # Optional

# Kubernetes
K8S_NAMESPACE=kubecent
K8S_SERVICE_ACCOUNT_PATH=/var/run/secrets/kubernetes.io/serviceaccount

# Cache
CACHE_TTL=300

# Security
ENABLE_SWAGGER=True
DEBUG=False
```

### Helm Values
Edit `helm/kubecent/values.yaml` to customize:
- Replica counts
- Resource limits
- OpenCost/Prometheus endpoints
- RBAC settings
- Ingress configuration

## Security

### RBAC Authorization
- Service account token validation via Kubernetes API
- Automatic request authentication
- User context attached to all API calls

### Network Security
- Pod security context (non-root user)
- Read-only filesystem where applicable
- Network policies support

### Data Privacy
- No external data export
- All data stays in-cluster
- No cloud dependencies

## Development

### Project Structure
```
kubecent/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Config, logging, exceptions
│   │   ├── middleware/    # Auth, logging middleware
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilities
│   └── package.json
├── docker/                # Dockerfiles and docker-compose
├── helm/kubecent/         # Helm chart
└── README.md
```

### Code Quality
- Type hints throughout (Python & TypeScript)
- Comprehensive docstrings
- SOLID principles
- Clean architecture patterns
- Structured logging

### Testing
```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm run test
```

## Optimization Rules

The platform includes intelligent analysis for:

1. **Idle Pod Detection**: Identifies pods with minimal resource usage
2. **Namespace Cost Review**: Highlights high-cost namespaces for review
3. **Resource Rightsizing**: Suggests appropriate request/limit adjustments
4. **Consolidation Opportunities**: Identifies workload consolidation candidates

## Monitoring & Observability

### Prometheus Metrics
- Request latency
- API call counts
- Error rates
- Cache hit ratios
- OpenCost API response times

### Structured Logging
All logs are JSON-formatted with contextual information:
```json
{
  "event": "authentication.success",
  "timestamp": "2024-01-24T10:30:00Z",
  "username": "kubecent",
  "namespace": "kubecent",
  "level": "INFO"
}
```

## Contributing

Contributions are welcome! Please:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Submit PRs with clear descriptions

## Roadmap

- [ ] Custom cost allocation rules
- [ ] Multi-cluster support
- [ ] Advanced ML-based recommendations
- [ ] Cost anomaly detection
- [ ] Budget alerts
- [ ] Cost forecasting
- [ ] Custom dashboards
- [ ] Scheduled reports

## Troubleshooting

### Backend not connecting to OpenCost
```bash
kubectl -n kubecent port-forward svc/opencost 9003:9003
# Then update OPENCOST_URL to http://opencost:9003
```

### Frontend can't reach backend
```bash
# Check service discovery
kubectl -n kubecent exec <frontend-pod> -- nslookup kubecent-backend
```

### RBAC authentication failing
```bash
# Verify service account token
kubectl -n kubecent get secrets
kubectl -n kubecent get serviceaccount kubecent
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: Report bugs and feature requests
- Documentation: Check the wiki for detailed guides
- Community: Join our Slack/Discord community

---

Built with ❤️ for Kubernetes cost optimization
