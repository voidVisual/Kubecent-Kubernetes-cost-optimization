# Backend Development Guide

## Architecture Overview

The backend follows clean architecture principles with clear separation of concerns:

```
app/
├── api/              # HTTP Layer - Request/Response handling
├── core/             # Application core - Config, logging, exceptions
├── middleware/       # Cross-cutting concerns
├── models/           # Data models - Pydantic schemas
├── services/         # Business logic layer
└── main.py           # Application entry point
```

## Key Design Patterns

### 1. Service Layer Pattern
Business logic is isolated in service classes:
- `CostService`: Handles cost data aggregation and caching
- `OptimizationService`: Generates recommendations

```python
# Dependency injection
service = CostService()
clusters_cost = service.get_cluster_cost()
```

### 2. Middleware Stack
Request processing pipeline:
1. **LoggingMiddleware**: Captures request/response timing
2. **RBACMiddleware**: Validates Kubernetes tokens
3. **CORSMiddleware**: Cross-origin requests

### 3. Error Handling
Domain-specific exceptions with context:

```python
try:
    data = service.get_cluster_cost()
except OpenCostException as e:
    logger.error("cluster_cost.error", error=e.message)
    raise HTTPException(status_code=503, detail=e.message)
```

### 4. Configuration Management
Environment-based configuration with validation:

```python
from app.core.config import settings

opencost_url = settings.OPENCOST_URL  # Validated, typed
cache_ttl = settings.CACHE_TTL  # With defaults
```

## Adding New Endpoints

### Step 1: Define Models
```python
# app/models/schemas.py
class MyResponse(BaseModel):
    value: str = Field(..., description="Value")
```

### Step 2: Create Service Logic
```python
# app/services/my_service.py
class MyService:
    def get_value(self) -> MyResponse:
        # Business logic here
        return MyResponse(value="data")
```

### Step 3: Add API Endpoint
```python
# app/api/v1/endpoints/my_endpoints.py
@router.get("/my-resource", response_model=MyResponse)
async def get_my_resource(request: Request) -> MyResponse:
    service = MyService()
    result = service.get_value()
    logger.info("endpoint.my_resource.success")
    return result
```

### Step 4: Include Router
```python
# app/api/v1/__init__.py
api_router.include_router(my_router, prefix="/my")
```

## Logging Best Practices

Use structured logging for observability:

```python
logger.info(
    "event.name",
    user=request.state.user.get("username"),
    status_code=200,
    duration_ms=15.3,
)
```

## Testing

Create tests in `backend/tests/`:

```python
# tests/test_cost_service.py
import pytest
from app.services.cost_service import CostService
from app.models.schemas import ClusterCost

@pytest.mark.asyncio
async def test_get_cluster_cost():
    service = CostService()
    result = await service.get_cluster_cost()
    assert isinstance(result, ClusterCost)
```

Run tests:
```bash
pytest tests/ -v --cov=app
```

## Security Considerations

1. **Input Validation**: Pydantic models validate all inputs
2. **Authentication**: RBAC middleware validates tokens
3. **Authorization**: Service account scopes define permissions
4. **Logging**: Sensitive data never logged
5. **HTTPS**: Use in production with proper TLS

## Performance Optimization

### Caching
```python
# Automatic cache with TTL
service._set_cache("key", value)
cached = service._get_cache("key")  # None if expired
```

### Connection Pooling
```python
# HTTPx client reuses connections
client = httpx.Client()  # Auto connection pool
```

### Async Patterns
```python
# Use async/await for I/O operations
async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
```
