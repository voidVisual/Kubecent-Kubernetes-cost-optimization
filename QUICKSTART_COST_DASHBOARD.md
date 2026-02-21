# Kubecent Cost Dashboard - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Step 2: Start Frontend
```bash
cd frontend
npm install
echo "VITE_BACKEND_URL=http://localhost:8000" > .env.local
npm run dev
```

### Step 3: Access Dashboard
Open browser: **http://localhost:5173**

Navigate to **Cost Dashboard** page to see the new interface!

---

## 📊 What You'll See

### Dashboard Features:
- **Total Cluster Cost** - Real-time cost aggregation
- **Idle Cost** - Wasted resource tracking
- **Efficiency Score** - A-F grading system
- **Potential Savings** - Optimization recommendations
- **Historical Chart** - 7-day cost trends
- **Namespace Table** - Per-namespace breakdown
- **Node Costs** - Per-node analysis
- **Recommendations** - Actionable savings tips

### Auto-Refresh:
- Data refreshes every 60 seconds automatically
- Manual refresh button available
- Shows last refresh timestamp

---

## 🔧 Configuration

### Environment Variables

**Frontend** (`frontend/.env.local`):
```env
VITE_BACKEND_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
OPENCOST_URL=http://opencost:9003
PROMETHEUS_URL=http://prometheus:9090
```

---

## 🐳 Docker Deployment

### Build Images
```bash
# Backend
docker build -f docker/Dockerfile.backend -t kubecent/backend:latest .

# Frontend
docker build -f docker/Dockerfile.frontend -t kubecent/frontend:latest .
```

### Run with Docker Compose
```bash
docker-compose -f docker/docker-compose.yml up
```

Access: **http://localhost:3000**

---

## ☸️ Kubernetes Deployment

### Deploy Everything
```bash
kubectl apply -f k8s-deployment.yaml
```

This creates:
- `kubecent` namespace
- Backend deployment (2 replicas)
- Frontend deployment (2 replicas)
- Services (ClusterIP + NodePort)

### Access Application
```bash
# Via NodePort
http://<node-ip>:30080

# Or port-forward
kubectl port-forward -n kubecent svc/kubecent-frontend 3000:80
```

Then: **http://localhost:3000**

---

## 🔍 Testing API Endpoints

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Get Allocations
```bash
curl http://localhost:8000/api/allocations
```

### Get Assets
```bash
curl http://localhost:8000/api/assets
```

### Get History
```bash
curl http://localhost:8000/api/history?range=7d
```

---

## 🛠️ Troubleshooting

### Frontend can't connect to backend?

1. Check backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. Check environment variable:
   ```bash
   cat frontend/.env.local
   ```

3. Check browser console for CORS errors

### Data not loading?

1. Check backend logs:
   ```bash
   # Local
   tail -f backend/logs/app.log
   
   # K8s
   kubectl logs -n kubecent deployment/kubecent-backend
   ```

2. Verify OpenCost is running:
   ```bash
   curl http://opencost:9003/allocation
   ```

### Auto-refresh not working?

Check the hook configuration:
```typescript
useAllocations({ autoRefresh: true, refreshInterval: 60000 });
```

---

## 📚 Documentation

- **Frontend Architecture**: [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)
- **Implementation Summary**: [FRONTEND_IMPLEMENTATION_SUMMARY.md](./FRONTEND_IMPLEMENTATION_SUMMARY.md)
- **Grafana Setup**: [GRAFANA_SETUP.md](./GRAFANA_SETUP.md)
- **API Reference**: [API_QUICKREF.md](./API_QUICKREF.md)

---

## 🎯 Key Files

### API Service
- `frontend/src/api/kubecentApi.ts` - Centralized API client

### Custom Hooks
- `frontend/src/hooks/useKubecentApi.ts` - Data fetching hooks

### Main Dashboard
- `frontend/src/pages/CostDashboard.tsx` - Complete dashboard page

### Type Definitions
- `frontend/src/types/api.ts` - TypeScript interfaces

---

## ✅ Verification Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Environment variable set correctly
- [ ] API health check returns 200
- [ ] Dashboard loads without errors
- [ ] Data refreshes every 60 seconds
- [ ] Time range selector works
- [ ] Manual refresh button works
- [ ] All charts render correctly
- [ ] Tables populate with data

---

## 🚀 Production Deployment

### Build for Production
```bash
cd frontend
npm run build
```

### Deploy to K8s
```bash
kubectl apply -f k8s-deployment.yaml
kubectl rollout status -n kubecent deployment/kubecent-frontend
```

### Verify Deployment
```bash
kubectl get pods -n kubecent
kubectl get svc -n kubecent
```

---

## 💡 Pro Tips

1. **Use the time range selector** to view 1d/7d/30d trends
2. **Click the refresh button** for instant data update
3. **Sort namespace table** by clicking column headers
4. **Check recommendations table** for quick wins
5. **Monitor efficiency score** for overall health

---

## 🆘 Support

**Issues?**
- Check logs: `kubectl logs -n kubecent deployment/kubecent-backend`
- Test backend: `curl http://localhost:8000/api/health`
- Verify CORS: Check browser console

**Questions?**
- Read: [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)
- Check: Backend API responses match TypeScript interfaces
- Verify: Environment variables are set correctly

---

**Happy Cost Optimizing! 💰📊**
