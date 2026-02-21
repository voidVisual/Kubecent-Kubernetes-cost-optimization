# Kubecent OpenCost Integration Guide

## Overview

The Kubecent backend integrates with OpenCost to fetch Kubernetes cluster cost data. This document explains the architecture, data flow, and API structure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubecent Frontend                            │
│              (React + Dashboard @ :3000)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP Requests
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│              Kubecent Backend (FastAPI)                          │
│                    (@:8000)                                      │
├─────────────────────────────────────────────────────────────────┤
│  API Routers:                                                    │
│  - /api/v1/health                (Health checks)               │
│  - /api/v1/cost/namespaces       (Namespace aggregation)       │
│  - /api/v1/cost/pods             (Pod-level costs)             │
│  - /api/v1/cost/monthly          (Trend analysis)              │
│  - /api/v1/savings/recommendations (Optimization hints)        │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  CostService: Normalizes OpenCost responses to Kubecent   ││
│  │  format, caches results, aggregates data                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                         │                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CacheManager: 5-minute TTL in-memory cache               │ │
│  │  - Stores allocation data keyed by (window, aggregate)   │ │
│  │  - Auto-expires old entries                               │ │
│  │  - Background refresh before TTL expiration               │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    OpenCost REST API
                    (httpx async client)
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│         OpenCost Service (in-cluster @ kubecost:9003)            │
│         (/api/v1/allocation, /api/v1/assets)                    │
├─────────────────────────────────────────────────────────────────┤
│  Kubernetes Cluster Cost Attribution Engine                      │
│  - Reads resource metrics from kubelet/API server              │
│  - Calculates CPU, memory, storage costs per pod              │
│  - Aggregates to namespace and cluster levels                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Request Flow Example: `GET /api/v1/cost/namespaces?window=7d`

1. **API Endpoint** (`app/api/v1/endpoints/costs.py::get_namespace_costs`)
   - Receives HTTP GET request with query parameters
   - Instantiates OpenCostClient and CostService
   - Calls `cost_service.get_cost_by_namespace(window="7d")`

2. **Service Layer** (`app/services/cost_service.py::CostService`)
   - Generates cache key: `cost:namespaces:7d:idle=False`
   - Checks cache via `cache.get_or_set()`
   - If cache miss, fetches from OpenCost:
     ```python
     allocation = await self.client.get_allocation(
         aggregate="namespace",  # Group by namespace
         window="7d",           # Last 7 days
         idle=False,           # Exclude idle costs
     )
     ```

3. **OpenCost Client** (`app/clients/opencost.py::OpenCostClient`)
   - Makes HTTP request: `GET /api/v1/allocation?aggregate=namespace&window=7d`
   - **Retry Logic** (via Tenacity):
     - If request fails: retry up to 3 times
     - Exponential backoff: 1s → 2s → 4s (max 10s)
     - Retries on: `httpx.HTTPError`, `TimeoutError`
   - **Timeout**: 30 seconds per request
   - Returns raw OpenCost response

4. **Response Normalization**
   - CostService receives OpenCost allocation data
   - Maps OpenCost fields to Kubecent schema:
     ```
     OpenCost fields              → Kubecent fields
     properties.namespace         → name
     cpuCost                      → cpu_cost
     memoryAllocatableCost        → memory_cost
     storageAllocatableCost       → storage_cost
     totalCost                    → total_cost
     idleCost                     → idle_cost
     ```
   - Aggregates costs (sums across all namespaces)

5. **Cache Storage**
   - Normalized response stored in cache
   - TTL: 300 seconds (5 minutes)
   - Key: `cost:namespaces:7d:idle=False`

6. **Response Return**
   - HTTP 200 with JSON body:
     ```json
     {
       "namespaces": [
         {
           "name": "default",
           "total_cost": 123.45,
           "cpu_cost": 50.0,
           "memory_cost": 30.0,
           "storage_cost": 40.0,
           "idle_cost": 3.45,
           "pod_count": 5
         }
       ],
       "total": 123.45,
       "window": "7d",
       "item_count": 1
     }
     ```

## OpenCost API Mapping

### OpenCost Response Structure

OpenCost's `/api/v1/allocation` endpoint returns:

```json
{
  "data": [
    {
      "name": "namespace-name",
      "properties": {
        "namespace": "namespace-name",
        "cluster": "cluster-name",
        "pod": "pod-name",
        "container": "container-name"
      },
      "window": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-08T00:00:00Z"
      },
      "cpuCost": 10.5,
      "cpuCostAdjustment": 0.5,
      "memoryAllocatableCost": 5.25,
      "memoryUsageCost": 3.0,
      "storageAllocatableCost": 2.10,
      "storageUsageCost": 1.5,
      "networkCost": 1.0,
      "idleCost": 0.5,
      "totalCost": 17.85
    }
  ]
}
```

### Aggregation Parameters

- **aggregate**: Grouping level
  - `namespace` - Group by Kubernetes namespace
  - `pod` - Group by pod (includes namespace in properties)
  - `container` - Group by container
  - `cluster` - Cluster-wide total

- **window**: Time range for cost calculation
  - `1d` - Last 1 day
  - `7d` - Last 7 days (default)
  - `30d` - Last 30 days
  - `90d` - Last 90 days
  - ISO 8601 format: `2024-01-01T00:00:00Z,2024-01-08T00:00:00Z`

- **idle**: Boolean flag
  - `true` - Include idle resource costs
  - `false` - Exclude idle costs

## API Endpoints

### 1. Health Check
```
GET /api/v1/health
```
- **Purpose**: Verify backend and OpenCost connectivity
- **Response**:
  ```json
  {
    "status": "healthy",
    "opencost": "connected",
    "service": "kubecent-backend"
  }
  ```

### 2. Costs by Namespace
```
GET /api/v1/cost/namespaces?window=7d&idle=false
```
- **Parameters**:
  - `window`: Time range (7d, 30d, 90d)
  - `idle`: Include idle costs (true/false)
- **Returns**: Aggregated costs per namespace
- **Cache**: 5 minutes

### 3. Costs by Pod
```
GET /api/v1/cost/pods?namespace=default&window=7d&idle=false
```
- **Parameters**:
  - `namespace`: Filter by namespace (optional)
  - `window`: Time range
  - `idle`: Include idle costs
- **Returns**: Pod-level cost breakdown
- **Cache**: 5 minutes

### 4. Monthly Costs
```
GET /api/v1/cost/monthly
```
- **Parameters**: None
- **Returns**: Monthly cost trends and aggregates
- **Cache**: 5 minutes
- **Calculation**: Uses 30-day window for current month

### 5. Savings Recommendations
```
GET /api/v1/savings/recommendations?limit=10
```
- **Parameters**:
  - `limit`: Maximum recommendations (1-50)
- **Returns**: Cost optimization opportunities
- **Algorithm**:
  1. Analyzes pod costs and idle allocations
  2. Identifies over-allocated resources
  3. Estimates savings potential
  4. Prioritizes by impact

## Caching Strategy

### Cache Configuration
- **TTL**: 300 seconds (5 minutes)
- **Storage**: In-memory (Python dict)
- **Thread-safe**: Uses `asyncio.Lock`
- **Expiration**: Auto-expired on access

### Cache Keys
- `cost:namespaces:{window}:idle={idle}` - Namespace costs
- `cost:pods:{namespace}:{window}:idle={idle}` - Pod costs
- `cost:monthly:{months}m` - Monthly trends

### Background Refresh
- **Interval**: Every 4 minutes
- **Tasks**:
  - Refresh namespace costs (7d, 30d)
  - Refresh pod costs (7d, 30d)
  - Clean up expired entries
- **Purpose**: Keep cache warm, prevent cold starts

## Error Handling

### OpenCost Connection Failures

The client implements automatic retry logic:

```python
@retry(
    stop=stop_after_attempt(3),  # Max 3 attempts
    wait=wait_exponential(multiplier=1, max=10),  # Exponential backoff
    retry=retry_if_exception_type((httpx.HTTPError, TimeoutError)),
    reraise=True,  # Re-raise after final failure
)
async def _request(method, url, **kwargs):
    # Makes HTTP request with retries
```

### Timeout Behavior
- **Request timeout**: 30 seconds
- **Response**: If OpenCost doesn't respond in 30s, request times out
- **Retry**: Timeout triggers retry with exponential backoff
- **Final failure**: Raises `OpenCostException`

## Configuration

### Environment Variables

```bash
# OpenCost endpoint (in-cluster service)
OPENCOST_URL=http://opencost:9003

# Request timeout
OPENCOST_TIMEOUT=30

# Cache TTL
CACHE_TTL=300  # 5 minutes

# API server settings
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

### Settings File
See `backend/app/core/config.py` for full configuration.

## Performance Considerations

### Response Times
- **Cache hit**: <10ms (in-memory lookup)
- **Cache miss**: 500ms - 2s (OpenCost API call)
- **With retries**: Up to 6 seconds (3 retries with backoff)

### Load Reduction
- **5-minute cache**: Reduces OpenCost API calls by ~99%
- **Example**: 
  - 100 dashboard requests/minute
  - Only 1 OpenCost API call (on cache miss)
  - Subsequent 99 requests served from cache

### Scalability
- **In-memory cache**: Scales to ~10,000 namespaces
- **Concurrent requests**: Limited by OpenCost API
- **Recommended**: Deploy multiple Kubecent replicas
- **Shared cache**: Use Redis for distributed cache

## Troubleshooting

### OpenCost Not Responding

Check OpenCost service:
```bash
kubectl get svc -n kubecost opencost
kubectl logs -n kubecost opencost-xxx
```

Test connectivity:
```bash
kubectl exec -it deployment/kubecent-backend -- \
  curl -v http://opencost:9003/health
```

### High Latency

Enable debug logging:
```bash
DEBUG=true
LOG_LEVEL=debug
```

Check OpenCost metrics:
```bash
curl http://opencost:9003/metrics
```

### Cache Not Refreshing

Check background tasks:
```python
# Verify task creation in logs
logger.info("background.tasks_started")
```

Check cache stats:
```python
cache = get_cache_manager()
print(cache.stats())  # {"hits": X, "misses": Y, "cached_items": Z}
```

## Future Enhancements

1. **Distributed Cache**: Replace in-memory with Redis for multi-replica deployments
2. **Historical Data**: Store time-series cost data in database
3. **Cost Alerts**: Notify on anomalies or threshold breaches
4. **Custom Aggregations**: User-defined cost grouping
5. **Chargeback Reports**: Department/team cost allocation
6. **Forecast Models**: ML-based cost predictions
