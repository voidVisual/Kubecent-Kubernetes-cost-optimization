# Kubecent Frontend Architecture

## Overview

The Kubecent frontend is a production-ready React + TypeScript application that provides a Kubecost-like interface for Kubernetes cost optimization. It follows clean architecture principles with complete separation of concerns.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Architecture

```
frontend/
├── src/
│   ├── api/                    # API service layer
│   │   └── kubecentApi.ts     # Centralized API client
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── useKubecentApi.ts  # API data fetching hooks
│   │
│   ├── components/             # Reusable UI components
│   │   ├── TotalCostCard.tsx
│   │   ├── IdleCostCard.tsx
│   │   ├── EfficiencyCard.tsx
│   │   ├── NamespaceTable.tsx
│   │   ├── NodeCostBreakdown.tsx
│   │   ├── SavingsTable.tsx
│   │   ├── HistoricalChart.tsx
│   │   ├── TimeRangeSelector.tsx
│   │   ├── RefreshButton.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorAlert.tsx
│   │
│   ├── pages/                  # Page components
│   │   └── CostDashboard.tsx  # Main dashboard
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── api.ts             # API response types
│   │
│   └── main.tsx               # Application entry point
```

## Key Features

### 1. Centralized API Service Layer

All API calls go through a single service (`kubecentApi.ts`):
- Axios-based HTTP client
- Request/response interceptors
- Error handling
- Type-safe responses
- Backend URL from environment variable

```typescript
import { kubecentApi } from '../api/kubecentApi';

// All endpoints available:
const health = await kubecentApi.getHealth();
const allocations = await kubecentApi.getAllocations();
const assets = await kubecentApi.getAssets();
const idle = await kubecentApi.getIdleCost();
const savings = await kubecentApi.getSavings();
const efficiency = await kubecentApi.getEfficiency();
const history = await kubecentApi.getHistory('7d');
```

### 2. Custom React Hooks

Each API endpoint has a dedicated hook:

```typescript
import {
  useAllocations,
  useAssets,
  useIdleCost,
  useSavings,
  useEfficiency,
  useHistory
} from '../hooks/useKubecentApi';

// In your component:
const allocations = useAllocations({ autoRefresh: true, refreshInterval: 60000 });
```

Features:
- **Auto-refresh**: Configurable automatic data refresh
- **Loading states**: Built-in loading indicators
- **Error handling**: Automatic error capture
- **Manual refetch**: Programmatic data refresh
- **Enabled control**: Conditional fetching

### 3. Type Safety

All API responses are fully typed:

```typescript
// Complete TypeScript interfaces for every response
interface AllocationsResponse {
  totalCost: number;
  currency: string;
  window: string;
  allocations: AllocationItem[];
}
```

### 4. Dashboard Features

#### Total Cluster Cost
- Aggregates allocation + asset costs
- Real-time updates
- Currency display

#### Namespace Cost Table
- Sortable by cost
- Per-namespace breakdown
- Pod counts
- CPU/Memory cost split

#### Node Cost Breakdown
- Per-node costs
- Instance type information
- Hourly rates
- Resource breakdown

#### Idle Cost Card
- Total idle resource cost
- Idle percentage
- Auto-refresh

#### Efficiency Score
- Overall efficiency percentage
- Letter grade (A-F)
- Color-coded indicators

#### Savings Recommendations
- Priority-based (high/medium/low)
- Resource identification
- Current vs projected costs
- Savings percentage
- Action recommendations

#### Historical Cost Chart
- Line chart with Recharts
- Multiple cost types (CPU, Memory, Storage)
- Time range selector (1d, 7d, 30d)
- Aggregation stats (min, max, avg, total)

### 5. Auto-Refresh System

All data automatically refreshes every 60 seconds:

```typescript
const allocations = useAllocations(); // Auto-refresh enabled by default
```

Manual refresh button available in UI:
- Shows last refresh time
- Triggers all data refetch
- Spinning animation feedback

### 6. Time Range Selection

Interactive selector for historical data:
- 1 day
- 7 days
- 30 days

Automatically refetches data when range changes.

## API Backend Integration

### Environment Variable

```env
VITE_BACKEND_URL=http://localhost:8000
```

### Backend Endpoints

The frontend expects these FastAPI endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/allocations` | GET | Namespace/pod/deployment costs |
| `/api/assets` | GET | Node/cluster costs |
| `/api/idle` | GET | Idle resource costs |
| `/api/savings` | GET | Optimization recommendations |
| `/api/efficiency` | GET | Efficiency scores |
| `/api/history?range={1d\|7d\|30d}` | GET | Historical cost data |

### Response Format

All endpoints return JSON. Example:

```json
{
  "totalCost": 1234.56,
  "currency": "USD",
  "window": "7d",
  "allocations": [...]
}
```

## Development

### Local Development

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Environment Setup

Create `.env.local`:

```env
VITE_BACKEND_URL=http://localhost:8000
```

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

## Docker Deployment

### Build Image

```bash
docker build -f docker/Dockerfile.frontend -t kubecent/frontend:latest .
```

### Run Container

```bash
docker run -d \
  -p 3000:80 \
  -e BACKEND_URL=http://backend:8000 \
  kubecent/frontend:latest
```

The `BACKEND_URL` environment variable is injected at runtime.

## Kubernetes Deployment

### Using kubectl

```bash
kubectl apply -f k8s-deployment.yaml
```

This deploys:
- Frontend deployment (2 replicas)
- Backend deployment (2 replicas)
- Services (ClusterIP for backend, NodePort for frontend)

### Access the Application

```bash
# Via NodePort
http://<node-ip>:30080

# Via port-forward
kubectl port-forward -n kubecent svc/kubecent-frontend 3000:80
# Then: http://localhost:3000
```

### Configuration

The frontend automatically connects to backend via:
```
http://kubecent-backend.kubecent.svc.cluster.local:8000
```

No configuration needed - service discovery handles it!

## Component Usage

### Example: Using in a New Page

```typescript
import React from 'react';
import { useAllocations } from '../hooks/useKubecentApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

export function MyPage() {
  const { data, loading, error, refetch } = useAllocations();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} onRetry={refetch} />;

  return (
    <div>
      <h1>Total Cost: ${data.totalCost}</h1>
      {/* Your UI here */}
    </div>
  );
}
```

## Best Practices

1. **Never call Prometheus or OpenCost directly** - All data must come through the FastAPI backend
2. **Use TypeScript strictly** - No `any` types
3. **Handle loading and error states** - Every API call must show loading/error UI
4. **Auto-refresh appropriately** - Use 60s for most data, 30s for health checks
5. **Memoize expensive computations** - Use `useMemo` for data transformations
6. **Keep components small** - Single responsibility principle
7. **Type all props and state** - Full TypeScript coverage

## Security

- No hardcoded credentials
- Environment variables for configuration
- CORS handled by backend
- All requests go through backend API gateway
- No direct cluster access from frontend

## Performance

- Auto-refresh with configurable intervals
- Conditional rendering to avoid unnecessary updates
- Lazy loading for large tables
- Recharts for efficient chart rendering
- Vite for fast builds and HMR

## Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Lint
npm run lint
```

## Troubleshooting

### Backend Connection Issues

Check the browser console:
```
[API] GET /api/allocations
```

If you see CORS errors, ensure backend has proper CORS configuration.

### Environment Variable Not Working

Vite requires `VITE_` prefix:
```env
# ✅ Correct
VITE_BACKEND_URL=http://localhost:8000

# ❌ Wrong
BACKEND_URL=http://localhost:8000
```

### Data Not Refreshing

Check if auto-refresh is enabled:
```typescript
useAllocations({ autoRefresh: true, refreshInterval: 60000 });
```

## Production Checklist

- [ ] Set correct `BACKEND_URL` in deployment
- [ ] Enable HTTPS/TLS on ingress
- [ ] Configure resource limits
- [ ] Set up health checks
- [ ] Enable monitoring/logging
- [ ] Use production build (`npm run build`)
- [ ] Verify CORS configuration
- [ ] Test error handling
- [ ] Check auto-refresh intervals
- [ ] Validate all API endpoints

## Support

For issues or questions:
- Check backend logs: `kubectl logs -n kubecent deployment/kubecent-backend`
- Check frontend logs: `kubectl logs -n kubecent deployment/kubecent-frontend`
- Verify service connectivity: `kubectl exec -it <pod> -- curl http://kubecent-backend:8000/api/health`

---

**Built with React + TypeScript for production Kubernetes cost optimization** 🚀
