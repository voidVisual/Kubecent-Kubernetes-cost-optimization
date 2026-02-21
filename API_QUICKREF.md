# API Quick Reference

## Endpoints Overview

All endpoints are prefixed with `/api/v1`

### Health
- `GET /health` - Service health check (OpenCost connectivity)

### Costs
- `GET /cost/namespaces?window=7d&idle=false` - Costs by namespace
- `GET /cost/pods?namespace=default&window=7d` - Costs by pod
- `GET /cost/monthly` - Monthly cost trends

### Savings
- `GET /savings/recommendations?limit=10` - Optimization recommendations

## Request Examples

### Get namespace costs for last 7 days
```bash
curl -X GET "http://localhost:8000/api/v1/cost/namespaces?window=7d&idle=false"
```

Response:
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
    },
    {
      "name": "kube-system",
      "total_cost": 45.67,
      "cpu_cost": 20.0,
      "memory_cost": 15.0,
      "storage_cost": 10.67,
      "idle_cost": 0.0,
      "pod_count": 12
    }
  ],
  "total": 169.12,
  "window": "7d",
  "item_count": 2
}
```

### Get pod costs for a namespace
```bash
curl -X GET "http://localhost:8000/api/v1/cost/pods?namespace=default&window=7d"
```

Response:
```json
{
  "pods": [
    {
      "namespace": "default",
      "name": "nginx-abc123",
      "total_cost": 45.67,
      "cpu_cost": 20.0,
      "memory_cost": 15.0,
      "storage_cost": 10.67
    }
  ],
  "namespace": "default",
  "total": 45.67,
  "window": "7d",
  "item_count": 1
}
```

### Get monthly cost trends
```bash
curl -X GET "http://localhost:8000/api/v1/cost/monthly"
```

Response:
```json
{
  "months": [
    {
      "month": "2024-01",
      "total_cost": 5000.00,
      "daily_average": 161.29,
      "namespaces": 5,
      "pods": 48
    }
  ],
  "total": 5000.00,
  "period": "1 month"
}
```

### Get cost optimization recommendations
```bash
curl -X GET "http://localhost:8000/api/v1/savings/recommendations?limit=10"
```

Response:
```json
{
  "recommendations": [
    {
      "id": "rec-001",
      "type": "reduce-idle",
      "namespace": "default",
      "resource": "nginx-abc123",
      "current_cost": 50.0,
      "estimated_savings": 20.0,
      "priority": "high",
      "description": "Pod nginx-abc123 has 20.0 in idle costs",
      "action": "Review resource requests and right-size to actual usage"
    }
  ],
  "total_potential_savings": 250.0,
  "savings_percentage": 15.5,
  "cluster_total_cost": 1612.90
}
```

## Code Examples

### Using CostService directly

```python
from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService

# Get client
opencost_client = get_opencost_client()

# Create service
cost_service = CostService(opencost_client)

# Fetch namespace costs (with caching)
namespace_costs = await cost_service.get_cost_by_namespace(
    window="7d",
    idle=False,
    use_cache=True
)

# Fetch without cache
fresh_costs = await cost_service.get_cost_by_namespace(
    window="7d",
    use_cache=False
)
```

### Using Cache Manager

```python
from app.services.cache import get_cache_manager

cache = get_cache_manager()

# Get from cache
data = await cache.get("my-key")

# Set in cache
await cache.set("my-key", {"data": value}, ttl=600)

# Get or set (fetch if not cached)
data = await cache.get_or_set(
    "cost-data",
    lambda: fetch_from_api(),
    ttl=300
)

# View stats
stats = cache.stats()
print(f"Cache hits: {stats['hits']}, misses: {stats['misses']}")
```

### Adding a new endpoint

```python
from fastapi import APIRouter, Query
from typing import Dict, Any

from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService

router = APIRouter()

@router.get("/my-endpoint", tags=["costs"])
async def my_endpoint(
    param: str = Query("default", description="My parameter"),
) -> Dict[str, Any]:
    """
    My new endpoint.
    
    Maps OpenCost data to Kubecent format.
    Results cached for 5 minutes.
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    
    # Fetch and return data
    data = await cost_service.some_method(param=param)
    return data
```

## OpenCost API Reference

OpenCost exposes these main endpoints:

### GET /api/v1/allocation
Fetch cost allocation data
- **Parameters**:
  - `aggregate`: `namespace`, `pod`, `container`, `cluster`
  - `window`: `7d`, `30d`, `90d`, or ISO dates
  - `idle`: `true` or `false`

### GET /api/v1/assets
Fetch asset information
- **Parameters**:
  - `window`: Time range
  - `accumulate`: `true` or `false`

### GET /health
Health check endpoint
- **Response**: `{"ready": true}`

## Environment Configuration

Create `.env` file:
```
OPENCOST_URL=http://opencost:9003
OPENCOST_TIMEOUT=30
DEBUG=false
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

## Testing

### Test OpenCost connectivity
```bash
curl -X GET "http://localhost:8000/api/v1/health"
```

### Test with different time windows
```bash
# Last 7 days
curl "http://localhost:8000/api/v1/cost/namespaces?window=7d"

# Last 30 days
curl "http://localhost:8000/api/v1/cost/namespaces?window=30d"

# Last 90 days
curl "http://localhost:8000/api/v1/cost/namespaces?window=90d"
```

### Test with cache bypass
```bash
# Note: Bypassing cache not yet implemented in endpoints
# But service layer supports: use_cache=False parameter
```

## Debugging

### Enable debug logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### View cache stats
```python
from app.services.cache import get_cache_manager

cache = get_cache_manager()
print(cache.stats())
```

### Trace OpenCost requests
OpenCost client logs all requests with structlog:
- `opencost.health_check` - Health check events
- `opencost.allocation_success` - Successful allocation queries
- `opencost.request_error` - HTTP errors with retry info

## Common Issues

### OpenCost returns no data
- Check window parameter format (should be like `7d`, `30d`)
- Verify cluster has running pods (need data to return)
- Check OpenCost logs for errors

### Cache not working
- Verify CacheManager is initialized
- Check cache TTL (default 300 seconds)
- Monitor cache.stats() for hit/miss ratio

### Slow responses
- First request after cache miss will be slow (OpenCost query)
- Subsequent requests should be <10ms
- Check OpenCost latency if consistently slow
