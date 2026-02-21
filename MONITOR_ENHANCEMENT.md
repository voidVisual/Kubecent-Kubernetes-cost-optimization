# Monitor Page Enhancement Summary

## Changes Made

### 1. Backend API Endpoints Created

#### New File: `backend/app/api/monitoring.py`
- **`GET /api/monitoring/cluster/stats`**: Real-time cluster statistics (pods, CPU, memory, network)
- **`GET /api/monitoring/pods`**: List all pods with metrics (CPU, memory, age, restarts)
- **`GET /api/monitoring/nodes`**: Node status, capacity, and utilization
- **`GET /api/monitoring/logs`**: Cluster logs from pods with filtering

Features:
- Direct integration with Kubernetes API
- Fallback to demo data if Kubernetes is not accessible
- Support for namespace filtering
- Real-time metrics from metrics-server
- Auto-parsing of resource units (millicores, MiB, GiB)

### 2. Frontend Monitor Page Enhanced

#### Updated File: `frontend/src/pages/Monitor.tsx`
New features:
- **Real Data Integration**: Fetches live cluster metrics instead of hardcoded demo data
- **Grafana Connection Status**: Shows "Connected" or "Not Connected" with proper icon
- **Setup Instructions Modal**: Expandable panel with Helm setup commands
- **Go to Dashboard Button**: Direct link to Grafana when connected
- **EKS Logs Viewer**: Real-time log streaming with:
  - Namespace filtering
  - Log level color coding (ERROR, WARNING, INFO, DEBUG)
  - Dark terminal-style interface
  - Auto-refresh every 10 seconds
  - Timestamp and pod/namespace metadata
- **Auto-refresh**: Metrics update every 30 seconds automatically
- **Manual Refresh Button**: Force refresh all data on demand

### 3. Backend Registration

#### Updated File: `backend/app/main.py`
- Registered monitoring router at `/api/monitoring/*`
- Added import for monitoring endpoints

### 4. Key Features

#### Grafana Integration
- Health check shows real connection status
- "Go to Dashboards" button appears only when connected
- Links to predefined dashboards (Cluster Overview, Pod Metrics, Cost Analysis, Node Performance)

#### Real Metrics Display
- **Active Pods**: Shows actual running pod count
- **CPU Usage**: Real CPU usage vs capacity (in cores)
- **Memory Usage**: Real memory usage vs capacity (in GB)
- **Network I/O**: Network metrics (if available)

#### Pod Monitoring Table
- Real pod data from Kubernetes API
- Namespace filtering
- Shows:
  - Pod name
  - Namespace
  - Status (Running, Pending, Failed)
  - CPU and memory usage
  - Age
  - Restart count

#### Node Status Cards
- Real node information
- CPU and memory utilization bars
- Instance type and availability zone
- Ready/NotReady status indicators

#### EKS Logs Viewer
- Streams logs from pods in real-time
- Color-coded by log level
- Filterable by namespace
- Shows last 100 log lines from last hour
- Terminal-style dark interface

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monitoring/cluster/stats` | GET | Cluster-wide statistics |
| `/api/monitoring/pods` | GET | Pod list with metrics |
| `/api/monitoring/nodes` | GET | Node list with status |
| `/api/monitoring/logs` | GET | Cluster logs |
| `/api/v1/grafana/health` | GET | Grafana connection status |
| `/api/v1/grafana/dashboards` | GET | Available dashboards |

## How It Works

### Data Flow

1. **Monitor Page Loads**
   - Fetches Grafana health status
   - Fetches cluster stats, pods, and nodes
   - Updates every 30 seconds automatically

2. **User Clicks "View Logs"**
   - Opens EKS logs viewer
   - Fetches last 100 log lines
   - Auto-refreshes every 10 seconds

3. **Grafana Integration**
   - If Grafana is connected, shows "Connected" status
   - "Go to Dashboard" button links to Grafana
   - Dashboard cards link to specific views

### Kubernetes Integration

The backend connects to Kubernetes using:
1. **In-cluster config**: When running inside Kubernetes
2. **Kubeconfig**: When running locally
3. **Fallback**: Demo data if Kubernetes is not accessible

Requires:
- `kubernetes` Python package (already in requirements.txt)
- Service account with proper RBAC permissions
- metrics-server installed in cluster for resource metrics

## OpenCost Data Collection Timeline

For the original issue with "•••" loading on first deployment:

- **0-15 minutes**: OpenCost starts collecting metrics from Prometheus
- **15-30 minutes**: First cost data becomes available
- **30-60 minutes**: Dashboard shows initial cost metrics
- **24-48 hours**: Data accuracy improves with historical trends

The new Monitor page will show real data immediately as it queries Kubernetes API directly.

## Testing

To test the changes:

1. **Restart backend**:
   ```bash
   kubectl -n kubecent rollout restart deployment/kubecent-backend
   ```

2. **Check logs**:
   ```bash
   kubectl -n kubecent logs -f deployment/kubecent-backend
   ```

3. **Access Monitor page** in browser

4. **Verify**:
   - Metrics show real cluster data
   - Grafana shows "Connected" status
   - "Go to Dashboard" button works
   - Pod table shows actual pods
   - Node cards show actual nodes
   - Logs viewer displays real logs

## Dependencies

### Backend
- `kubernetes==28.1.0` (already in requirements.txt)
- Service account with cluster-level read access
- metrics-server for pod/node metrics

### Frontend
- No new dependencies required
- Uses existing `apiClient` for HTTP requests

## Files Modified/Created

### Created:
- `backend/app/api/monitoring.py` (new monitoring endpoints)
- `backend/app/api/dashboard.py` (fixed API mismatch)

### Modified:
- `backend/app/main.py` (registered new routers)
- `frontend/src/pages/Monitor.tsx` (complete rewrite with real data)

## Next Steps

1. Deploy updated backend and frontend
2. Grant Kubernetes service account proper RBAC:
   ```yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind:ClusterRole
   metadata:
     name: kubecent-monitor
   rules:
   - apiGroups: [""]
     resources: ["pods", "pods/log", "nodes"]
     verbs: ["get", "list"]
   - apiGroups: ["metrics.k8s.io"]
     resources: ["pods", "nodes"]
     verbs: ["get", "list"]
   ```
3. Test all monitoring features
4. Configure Grafana URL in backend settings if not auto-detected
