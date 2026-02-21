# Quick Start Guide - Kubecent

## 🚀 5-Minute Quick Start

### Prerequisites
- Docker & Docker Compose
- kubectl (for Kubernetes deployment)
- Helm 3 (for production)

### Local Development (Fastest)

```bash
cd kubecent

# Start local environment with all services
docker-compose -f docker/docker-compose.yml up

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
# Prometheus: http://localhost:9090
```

### Manual Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn app.main:app --reload

# Server runs at http://localhost:8000
# API docs at http://localhost:8000/api/docs
```

### Manual Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Server runs at http://localhost:5173
# Open browser to http://localhost:5173
```

---

## 🎯 Common Tasks

### Build Docker Images

```bash
docker build -f docker/Dockerfile.backend -t kubecent-backend:latest .
docker build -f docker/Dockerfile.frontend -t kubecent-frontend:latest .
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace kubecent

# Deploy with Helm
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace

# Access frontend
kubectl port-forward -n kubecent svc/kubecent-frontend 3000:80

# View backend logs
kubectl logs -n kubecent -f deployment/kubecent-backend
```

### Run Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

### Code Formatting

```bash
# Backend
cd backend
black .
ruff check . --fix

# Frontend
cd frontend
npm run lint
npm run format  # If available
```

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| **README.md** | Project overview, features, architecture |
| **BACKEND.md** | Backend architecture, patterns, development guide |
| **FRONTEND.md** | Frontend architecture, patterns, development guide |
| **DEPLOYMENT.md** | Kubernetes deployment, configuration, troubleshooting |
| **STRUCTURE.md** | Project directory structure and file organization |
| **PROJECT_SUMMARY.md** | Detailed feature list and completion status |
| **Makefile** | Common development tasks and commands |

---

## 🔍 Key Files to Understand

### Backend Entry Point
[app/main.py](backend/app/main.py) - FastAPI app initialization

### Frontend Entry Point
[src/App.tsx](frontend/src/App.tsx) - React app with routing

### API Models
[app/models/schemas.py](backend/app/models/schemas.py) - All API schemas

### Cost Service
[app/services/cost_service.py](backend/app/services/cost_service.py) - Business logic

### API Endpoints
[app/api/v1/endpoints/](backend/app/api/v1/endpoints/) - All endpoints

### Helm Chart
[helm/kubecent/values.yaml](helm/kubecent/values.yaml) - Configuration

---

## 🌐 API Endpoints

### Cost Data
```
GET  /api/v1/costs/cluster           # Cluster-wide costs
GET  /api/v1/costs/namespaces        # Per-namespace costs
GET  /api/v1/costs/pods?namespace=X  # Per-pod costs
```

### Optimization
```
GET  /api/v1/optimizations/report    # Recommendations
```

### Health & Metrics
```
GET  /health                         # Health check
GET  /metrics                        # Prometheus metrics
```

---

## 🐳 Docker Compose Services

```
Services running on startup:
├── kubecent-backend    (port 8000)
├── kubecent-frontend   (port 3000)
├── opencost            (port 9003) - Mock
└── prometheus          (port 9090) - Mock
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Prometheus: http://localhost:9090

---

## ⚙️ Configuration

### Backend (.env)
```env
DEBUG=True
OPENCOST_URL=http://opencost:9003
PROMETHEUS_URL=http://prometheus:9090
CACHE_TTL=300
LOG_LEVEL=INFO
```

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Kubernetes (values.yaml)
Edit `helm/kubecent/values.yaml` to customize:
- Replicas and autoscaling
- Resource limits
- Service type (NodePort/Ingress)
- OpenCost/Prometheus URLs

---

## 🚨 Troubleshooting

### Backend not starting
```bash
# Check Python version
python --version  # Should be 3.11+

# Check dependencies
pip install -r backend/requirements.txt --upgrade

# Run with verbose output
python -m uvicorn app.main:app --reload --log-level debug
```

### Frontend not compiling
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

### Kubernetes deployment failing
```bash
# Check if namespace exists
kubectl get namespace kubecent

# Check pod status
kubectl describe pod -n kubecent deployment/kubecent-backend

# View logs
kubectl logs -n kubecent -f deployment/kubecent-backend

# Verify RBAC
kubectl auth can-i get pods --as=system:serviceaccount:kubecent:kubecent
```

### OpenCost not accessible
```bash
# Verify OpenCost is running
kubectl get pods -n kubecost  # Or wherever OpenCost is deployed

# Check connectivity from backend
kubectl exec -it -n kubecent deployment/kubecent-backend -- \
  curl http://opencost:9003/health
```

---

## 📊 Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                     Internet/Intranet                   │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴──────────────┐
         │                           │
         ▼                           ▼
    ┌─────────┐               ┌──────────┐
    │ Frontend│───────┬─────▶│ Backend  │
    │(React)  │       │      │(FastAPI) │
    └─────────┘       │      └──┬───┬───┘
                      │         │   │
                      │    ┌────▼─┐ └─────────┐
                      │    ▼      ▼           ▼
                      │ ┌─────────────┐  ┌──────────┐
                      │ │ OpenCost    │  │Prometheus│
                      │ │ (Cost Data) │  │(Metrics) │
                      │ └─────────────┘  └──────────┘
                      │
                  ┌───▼──────────┐
                  │ Kubernetes   │
                  │ (In-cluster) │
                  └──────────────┘
```

---

## 🔐 Security

- **Authentication**: Kubernetes service account tokens
- **Authorization**: RBAC with minimal required permissions
- **Encryption**: TLS ready (via Ingress)
- **Network**: CORS configured, security headers
- **Data**: Stays in-cluster, no external export

---

## 📈 Performance Tips

1. **Increase replicas** for higher load:
   ```bash
   kubectl scale deployment -n kubecent --replicas=3 kubecent-backend
   ```

2. **Adjust cache TTL** in values.yaml:
   ```yaml
   cacheTTL: 600  # 10 minutes instead of 5
   ```

3. **Monitor metrics**:
   ```bash
   kubectl port-forward -n kubecent svc/prometheus 9090:9090
   # Then open http://localhost:9090
   ```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "feat: description"`
4. Push to branch: `git push origin feature/name`
5. Open Pull Request

---

## 📞 Support

- Check [README.md](README.md) for overview
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- Review [BACKEND.md](BACKEND.md) for backend development
- Review [FRONTEND.md](FRONTEND.md) for frontend development

---

## ✅ Checklist: First Time Setup

- [ ] Clone repository
- [ ] Install Docker & Docker Compose
- [ ] Run `docker-compose up` to test locally
- [ ] Verify all services start
- [ ] Access frontend at http://localhost:3000
- [ ] Check backend API docs at http://localhost:8000/api/docs
- [ ] Read README.md for full context
- [ ] Review architecture diagrams
- [ ] Try Makefile commands: `make help`
- [ ] Plan your Kubernetes deployment

---

## 📦 Deployment Summary

### For Development
```bash
make docker-up
```

### For Kubernetes
```bash
make deploy-k8s
```

### For Production
1. Edit `helm/kubecent/values.yaml`
2. Build images with your registry
3. Push to registry
4. Update image names in values.yaml
5. Run: `helm install kubecent ./helm/kubecent -f values.yaml`

---

Generated: January 24, 2026
Version: 0.1.0
