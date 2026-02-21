import { useAllocations } from '@/hooks/useAllocations';

function Dashboard() {
  const { data, loading, error, refetch, lastFetched } = useAllocations({
    enablePolling: true,
    pollingInterval: 60000
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Total: ${data?.totalCost}</h2>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}# KubeCent - Kubecost-Like Dashboard

**Version**: 2.0  
**Last Updated**: January 27, 2026  
**Status**: Complete & Production-Ready

## Overview

KubeCent is a comprehensive Kubernetes cost optimization platform featuring a Kubecost-like dashboard with real-time cost monitoring, resource efficiency analysis, and actionable savings recommendations.

## Features

### 1. **Dashboard** (Overview)
Real-time cluster-wide cost metrics and visualizations:
- **Total Monthly Cost**: Aggregate cost across all resources
- **CPU Efficiency**: Percentage of CPU utilization vs requested
- **Memory Efficiency**: Percentage of memory utilization vs requested
- **Network Cost**: Network-related charges
- **30-Day Cost Trend**: Line chart showing cost progression
- **Cost Breakdown**: Pie chart showing distribution by resource type (CPU, Memory, Storage, Network)
- **Budget Alerts**: Active budget threshold alerts with severity levels

**Location**: `Dashboard.tsx`

### 2. **Cost Allocation**
Detailed cost breakdown by namespace, pod, or controller:
- **View Modes**: Switch between namespace, pod, and controller grouping
- **Stacked Bar Chart**: Visual representation of cost breakdown by resource type
- **Summary Statistics**: Total cost, number of namespaces/pods, average costs
- **Detailed Table**: Sortable table with cost components and trends
- **Export Functionality**: Download cost data
- **Filtering**: Filter by various criteria

**Location**: `CostAllocation.tsx`

### 3. **Resource Efficiency**
Advanced resource utilization analysis:
- **Efficiency Scores**: CPU and memory efficiency percentages
- **Over-Provisioned Detection**: Identify pods using <30% of requests
- **Savings Potential**: Calculate monthly savings from optimization
- **Requested vs Used Chart**: Bar chart comparison
- **Utilization Pattern**: Scatter plot showing resource usage patterns
- **Over-Provisioned Table**: Detailed view of inefficient pods

**Location**: `ResourceEfficiency.tsx`

### 4. **Savings Opportunities**
Cost optimization recommendations:
- **Annual Savings Potential**: Total estimated savings
- **Recommendation Tracking**: Count of active, implemented, and total recommendations
- **Priority Filtering**: Filter by critical, high, medium, low
- **Category Filtering**: Filter by optimization type (rightsizing, idle, consolidation, scaling)
- **Detailed Cards**: Each recommendation includes:
  - Title and description
  - Estimated savings
  - Affected resources
  - Action buttons (Learn More, Implement, Dismiss)
- **Implementation Guide**: Step-by-step optimization process

**Location**: `Savings.tsx`

### 5. **Nodes & Pods Monitoring**
Real-time Kubernetes resource monitoring:
- **Node View**: 
  - Node status and health
  - CPU and memory utilization bars
  - Pod count per node
  - Automatic color-coded alerts
- **Pod View**:
  - Pod name and namespace
  - CPU usage vs requested
  - Memory usage vs requested
  - Network in/out metrics
  - Sortable table format

**Location**: `NodesAndPods.tsx`

## Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts (Line, Bar, Pie, Scatter)
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend API Endpoints

#### Cost Endpoints
```
GET /api/v1/cost/cluster - Get cluster-wide costs
GET /api/v1/cost/namespaces - Get costs by namespace
GET /api/v1/cost/pods - Get pod-level costs
```

#### Metrics Endpoints
```
GET /api/v1/metrics/pods - Get pod resource metrics
GET /api/v1/metrics/nodes - Get node resource metrics
GET /api/v1/metrics/efficiency - Get resource efficiency analysis
GET /api/v1/metrics/trends - Get historical cost trends
GET /api/v1/metrics/budget-alerts - Get active budget alerts
```

#### Optimization Endpoints
```
GET /api/v1/optimizations/report - Get optimization recommendations
```

### Backend Services

#### MetricsService (`metrics_service.py`)
Handles real-time metric collection:
- Pod metrics (CPU, memory, network)
- Node metrics (capacity, allocation, usage)
- Resource efficiency calculations
- Mock data generation for development

#### CostService (`cost_service.py`)
Existing service for cost data:
- OpenCost API integration
- Cost aggregation
- Caching with TTL

#### OptimizationService (`optimization_service.py`)
Existing service for recommendations:
- Idle pod detection
- Rightsizing suggestions
- Consolidation recommendations

## Data Models

### PodMetrics
```typescript
{
  pod: string
  namespace: string
  cpu_usage: number (cores)
  cpu_requested: number (cores)
  memory_usage: number (MB)
  memory_requested: number (MB)
  network_in: number (bytes/sec)
  network_out: number (bytes/sec)
  timestamp: datetime
}
```

### NodeMetrics
```typescript
{
  node: string
  cpu_capacity: number
  cpu_allocatable: number
  cpu_used: number
  memory_capacity: number (GB)
  memory_allocatable: number (GB)
  memory_used: number (GB)
  pod_count: number
  status: string (Ready, NotReady, etc)
  timestamp: datetime
}
```

### BudgetAlert
```typescript
{
  alert_id: string
  namespace: string
  budget_limit: number (USD)
  current_spend: number (USD)
  percentage: number (0-100)
  severity: string (info, warning, critical)
  message: string
  created_at: datetime
}
```

## UI/UX Design

### Color Scheme
- **Background**: Dark gray (#111827 - gray-900)
- **Cards**: Medium gray (#1f2937 - gray-800)
- **Borders**: Light gray (#374151 - gray-700)
- **Primary**: Blue (#3b82f6 - blue-600)
- **Secondary**: Purple, Orange, Green variants
- **Text**: White (#ffffff) for headers, light gray for secondary

### Component Patterns

#### Metric Cards
- Icon with colored background
- Large bold value
- Trend indicator with percentage
- Hover effects

#### Charts
- Dark background with light gridlines
- Tooltips on hover
- Color-coded data series
- Responsive sizing

#### Tables
- Hover row highlights
- Sortable headers
- Alternating row colors
- Sticky headers

#### Status Indicators
- Color-coded badges (green, yellow, red)
- Progress bars for percentage metrics
- Icon+text combinations

## Integration with Existing Features

The new dashboard integrates seamlessly with existing KubeCent components:

1. **Authentication**: Uses existing RBAC middleware
2. **Logging**: Utilizes structlog configuration
3. **Configuration**: Leverages existing settings
4. **OpenCost Integration**: Extends existing cost service
5. **Prometheus Integration**: Uses existing Prometheus setup

## Development

### File Structure
```
frontend/src/
├── pages/
│   ├── Dashboard.tsx           (Main overview)
│   ├── CostAllocation.tsx      (Cost breakdown)
│   ├── ResourceEfficiency.tsx  (Efficiency analysis)
│   ├── Savings.tsx             (Recommendations)
│   └── NodesAndPods.tsx        (Node/Pod monitoring)
├── components/
│   ├── Header.tsx              (Updated navigation)
│   └── ...existing components
└── App.tsx                      (Updated routing)

backend/app/
├── services/
│   ├── metrics_service.py      (New metrics service)
│   ├── cost_service.py         (Existing)
│   └── optimization_service.py (Existing)
├── api/v1/endpoints/
│   ├── metrics.py              (New metrics endpoints)
│   ├── costs.py                (Existing)
│   └── optimizations.py        (Existing)
└── models/
    └── schemas.py              (Extended schemas)
```

### Running the Application

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Access the dashboard at `http://localhost:5173`

## Kubecost Feature Parity

KubeCent now provides feature parity with Kubecost:

| Feature | Kubecost | KubeCent | Status |
|---------|----------|----------|--------|
| Cost Dashboard | ✓ | ✓ | ✅ |
| Cost Allocation | ✓ | ✓ | ✅ |
| Resource Efficiency | ✓ | ✓ | ✅ |
| Savings Recommendations | ✓ | ✓ | ✅ |
| Budget Alerts | ✓ | ✓ | ✅ |
| Node Monitoring | ✓ | ✓ | ✅ |
| Pod Metrics | ✓ | ✓ | ✅ |
| Multi-Cluster | ⚠️ | 🔄 | In Progress |
| Custom Reports | ✓ | 🔄 | Planned |
| API Export | ✓ | 🔄 | Planned |

## Performance Considerations

- **Data Caching**: 5-minute TTL on cost data
- **Real-time Metrics**: Direct Prometheus queries
- **Chart Optimization**: Recharts with responsive sizing
- **Lazy Loading**: Pages load on demand
- **Pagination**: Large datasets use pagination

## Monitoring & Observability

KubeCent includes:
- Prometheus metrics export at `/metrics`
- Structured JSON logging
- Request/response logging middleware
- Health checks at `/health`
- API documentation at `/api/docs`

## Future Enhancements

1. **Multi-Cluster Support**: Monitor costs across multiple clusters
2. **Custom Reports**: User-defined report generation
3. **API Export**: Export metrics and recommendations
4. **Webhook Integration**: Real-time alert notifications
5. **ML-Based Predictions**: Forecast future costs
6. **Cost Chargeback**: Multi-tenant cost allocation
7. **RBAC Integration**: Namespace-specific access control
8. **Custom Dashboards**: User-configurable widgets

## Troubleshooting

### Metrics not showing
- Verify Prometheus is running at the configured URL
- Check if pods have resource requests defined
- Review backend logs for API errors

### High memory usage
- Enable data pagination
- Increase TTL on cache
- Limit historical data range

### Slow charts
- Reduce number of data points
- Use aggregated endpoints
- Enable chart caching

## Support & Documentation

- **API Docs**: http://localhost:8000/api/docs
- **Backend Logs**: Check console output
- **Frontend Errors**: Check browser console
- **Performance**: Monitor at `/metrics`

---

**KubeCent v2.0** - Kubernetes cost optimization platform with Kubecost-like capabilities.
Built with React, FastAPI, and Prometheus for real-time cost monitoring and optimization.
