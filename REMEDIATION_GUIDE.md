# Production Readiness Remediation Guide
**Priority:** IMPLEMENT BEFORE PRODUCTION DEPLOYMENT

---

## 1. CRITICAL: Fix CORS Configuration

### File: `backend/app/core/config.py`

**BEFORE:**
```python
CORS_ORIGINS: List[str] = Field(
    default=["*"],
    description="CORS allowed origins",
)
```

**AFTER:**
```python
from typing import List
from pydantic import Field, validator

class Settings(BaseSettings):
    # ... other settings ...
    
    CORS_ORIGINS: List[str] = Field(
        default=["https://app.example.com"],
        description="CORS allowed origins",
    )
    
    @validator('CORS_ORIGINS')
    def validate_cors_origins(cls, v):
        """Validate that CORS origins are not wildcards in production."""
        if os.getenv('ENVIRONMENT') == 'production':
            if '*' in v:
                raise ValueError("Wildcard CORS origins not allowed in production")
        return v
```

**Implementation Steps:**
1. Update `backend/app/core/config.py`
2. Set environment-specific origins:
   - **Development**: `["http://localhost:3000"]`
   - **Staging**: `["https://staging-app.example.com"]`
   - **Production**: `["https://app.example.com"]`
3. Update `.env` files for each environment:
   ```bash
   # .env.development
   CORS_ORIGINS=["http://localhost:3000"]
   
   # .env.production
   CORS_ORIGINS=["https://app.example.com"]
   ```

---

## 2. CRITICAL: Fix Authentication Bypass

### File: `backend/app/middleware/auth.py`

**BEFORE:**
```python
async def dispatch(self, request: Request, call_next):
    """Process request with RBAC validation."""
    
    # Skip authentication for health checks, metrics, and all API endpoints
    # In production, you would implement proper RBAC with service account tokens
    if request.url.path in ["/health", "/metrics", "/api/v1/health"] or request.url.path.startswith("/api/"):
        return await call_next(request)
    
    # ... rest of auth logic ...
```

**AFTER:**
```python
async def dispatch(self, request: Request, call_next):
    """Process request with RBAC validation."""
    
    # Define paths that don't require authentication
    PUBLIC_PATHS = {
        "/health",
        "/metrics",
        "/api/v1/health",
        "/api/docs",
        "/api/openapi.json",
        "/api/redoc",
    }
    
    # Don't require auth for public endpoints
    if request.url.path in PUBLIC_PATHS or any(
        request.url.path.startswith(p) for p in ["/api/docs", "/api/redoc"]
    ):
        return await call_next(request)
    
    # For all other endpoints, validate authentication
    token = self._extract_token(request)
    
    if not token:
        logger.warning("request.no_token", path=request.url.path)
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token"
        )
    
    try:
        payload = self._decode_token(token)
        # Attach user info to request
        request.state.user = payload
    except AuthenticationException as e:
        logger.warning("request.authentication_failed", path=request.url.path, error=str(e))
        raise HTTPException(status_code=401, detail=str(e))
    
    return await call_next(request)
```

**Implementation Steps:**
1. Update `backend/app/middleware/auth.py`
2. Test with proper authentication tokens
3. Verify that unauthenticated requests are rejected:
   ```bash
   # Should return 401
   curl http://localhost:8000/api/v1/cost/cluster
   
   # Should return 200 (with proper token)
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8000/api/v1/cost/cluster
   ```

---

## 3. CRITICAL: Enforce JWT Signature Verification

### File: `backend/app/middleware/auth.py`

**BEFORE:**
```python
def _decode_token(self, token: str) -> dict:
    try:
        # In production, validate with Kubernetes CA certificate
        # For development, we can disable verification
        options = {"verify_signature": False} if self.settings.DEBUG else {}
        
        payload = jwt.decode(
            token,
            options=options,
            algorithms=[self.settings.JWT_ALGORITHM],
        )
        return payload
```

**AFTER:**
```python
def _decode_token(self, token: str) -> dict:
    ```python
    # ALWAYS verify signatures - never disable in production
    if self.settings.ENVIRONMENT == "production" and not settings.ENABLE_SIGNATURE_VERIFICATION:
        raise ConfigurationException(
            "Signature verification MUST be enabled in production"
        )
    
    # Load CA certificate for Kubernetes tokens
    if not self._ca_cert:
        self._ca_cert = self._load_ca_cert()
    
    try:
        payload = jwt.decode(
            token,
            self._ca_cert or settings.JWT_SECRET,
            algorithms=[self.settings.JWT_ALGORITHM],
            options={"verify_signature": True}  # Always verify
        )
        return payload
    except PyJWTError as e:
        logger.warning("token.validation_failed", error=str(e))
        raise AuthenticationException(f"Invalid token: {str(e)}")
```

**Implementation Steps:**
1. Update `backend/app/core/config.py` to add:
   ```python
   ENABLE_SIGNATURE_VERIFICATION: bool = Field(
       default=True,
       description="Always enable signature verification"
   )
   JWT_SECRET: str = Field(
       default="",
       description="JWT secret for development (use Kubernetes CA in production)"
   )
   ```

2. Add validation on startup:
   ```python
   @app.on_event("startup")
   async def validate_auth_config():
       if settings.ENVIRONMENT == "production" and settings.DEBUG:
           raise ConfigurationException(
               "DEBUG mode cannot be enabled in production"
           )
       if not settings.JWT_SECRET and not settings.DEBUG:
           logger.warning("jwt_secret_not_configured")
   ```

---

## 4. HIGH: Add Input Validation Middleware

### New File: `backend/app/middleware/validation.py`

```python
"""
Request validation middleware.

Validates request size, content type, and prevents common attacks.
"""

import structlog
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = structlog.get_logger(__name__)

MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate incoming requests."""
    
    async def dispatch(self, request: Request, call_next):
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_SIZE:
            logger.warning("request.too_large", size=int(content_length))
            return JSONResponse(
                status_code=413,
                content={"error": "Request entity too large"}
            )
        
        # Validate content type for POST/PUT
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith(("application/json", "multipart/form-data")):
                logger.warning("request.invalid_content_type", 
                             content_type=content_type)
                return JSONResponse(
                    status_code=415,
                    content={"error": "Unsupported media type"}
                )
        
        return await call_next(request)
```

**Add to `backend/app/main.py`:**
```python
from app.middleware.validation import RequestValidationMiddleware

# In create_app() function:
app.add_middleware(RequestValidationMiddleware)
```

---

## 5. HIGH: Add Rate Limiting

### New File: `backend/app/middleware/rate_limit.py`

```python
"""
Rate limiting middleware using token bucket algorithm.
"""

import time
import structlog
from typing import Dict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = structlog.get_logger(__name__)

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting implementation."""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.client_requests: Dict[str, list] = {}
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier."""
        forward_for = request.headers.get("x-forwarded-for")
        if forward_for:
            return forward_for.split(",")[0].strip()
        return request.client.host
    
    async def dispatch(self, request: Request, call_next):
        client_id = self._get_client_id(request)
        current_time = time.time()
        
        # Initialize client bucket
        if client_id not in self.client_requests:
            self.client_requests[client_id] = []
        
        # Remove old requests (older than 1 minute)
        self.client_requests[client_id] = [
            req_time for req_time in self.client_requests[client_id]
            if current_time - req_time < 60
        ]
        
        # Check rate limit
        if len(self.client_requests[client_id]) >= self.requests_per_minute:
            logger.warning("rate_limit.exceeded", 
                          client_id=client_id,
                          requests=len(self.client_requests[client_id]))
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests"}
            )
        
        # Record request
        self.client_requests[client_id].append(current_time)
        
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.client_requests[client_id])
        )
        return response
```

**Configuration in `backend/app/core/config.py`:**
```python
RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(
    default=100,
    description="Rate limit: requests per minute per client"
)
```

---

## 6. HIGH: Add Global Exception Handlers

### Update: `backend/app/main.py`

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.exceptions import KubcentException

def create_app() -> FastAPI:
    app = FastAPI(...)
    
    # ... existing middleware and routers ...
    
    # Exception handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors."""
        logger.warning("validation_error", 
                      path=request.url.path,
                      errors=exc.errors())
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation failed",
                "details": [
                    {
                        "field": str(e["loc"]),
                        "message": e["msg"],
                        "type": e["type"]
                    }
                    for e in exc.errors()
                ]
            }
        )
    
    @app.exception_handler(KubcentException)
    async def kubcent_exception_handler(request: Request, exc: KubcentException):
        """Handle domain-specific exceptions."""
        status_code = {
            "AuthenticationException": 401,
            "AuthorizationException": 403,
            "NotFoundException": 404,
            "ValidationException": 400,
        }.get(exc.code, 500)
        
        logger.error("application_error",
                    code=exc.code,
                    message=exc.message,
                    path=request.url.path)
        
        return JSONResponse(
            status_code=status_code,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle uncaught exceptions."""
        error_id = str(uuid4())
        
        logger.error("uncaught_exception",
                    error_id=error_id,
                    error_type=type(exc).__name__,
                    error=str(exc),
                    path=request.url.path)
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "error_id": error_id,  # For support/debugging
                "message": "An unexpected error occurred"
            }
        )
    
    return app
```

---

## 7. HIGH: Add Request Caching Configuration

### Update: `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Cache configuration
    CACHE_TTL_SECONDS: int = Field(
        default=300,
        description="Cache TTL in seconds"
    )
    CACHE_ENDPOINTS: Dict[str, int] = Field(
        default={
            "/api/v1/cost/cluster": 600,      # 10 minutes
            "/api/v1/cost/alerts": 300,       # 5 minutes
            "/api/v1/metrics/nodes": 300,     # 5 minutes
            "/api/v1/recommendations": 1800,  # 30 minutes
        },
        description="Endpoint-specific cache TTLs"
    )
    ENABLE_CACHE_WARMING: bool = Field(
        default=True,
        description="Warm cache on startup"
    )
```

### Create: `backend/app/services/cache_warmer.py`

```python
"""
Cache warming service - pre-load frequently accessed data.
"""

import asyncio
import structlog
from app.services.cost_service import CostService
from app.services.metrics_service import MetricsService

logger = structlog.get_logger(__name__)

class CacheWarmer:
    """Warm cache with frequently accessed data."""
    
    def __init__(self, cost_service: CostService, metrics_service: MetricsService):
        self.cost_service = cost_service
        self.metrics_service = metrics_service
    
    async def warm_cache(self):
        """Load frequently accessed data into cache."""
        try:
            logger.info("cache_warming.start")
            
            tasks = [
                self.cost_service.get_cluster_costs(),
                self.cost_service.get_namespace_breakdown(),
                self.metrics_service.get_node_metrics(),
                self.metrics_service.get_pod_metrics(),
            ]
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info("cache_warming.complete")
        except Exception as e:
            logger.error("cache_warming.failed", error=str(e))
```

---

## 8. HIGH: Database Implementation (PostgreSQL)

### New File: `backend/app/db/models.py`

```python
"""
Database models for cost tracking and audit logs.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class CostSnapshot(BaseModel):
    """Cost data snapshot."""
    timestamp: datetime
    cluster_name: str
    namespace: Optional[str] = None
    pod_name: Optional[str] = None
    node_name: Optional[str] = None
    total_cost: Decimal = Field(..., decimal_places=2)
    cpu_cost: Decimal = Field(..., decimal_places=2)
    memory_cost: Decimal = Field(..., decimal_places=2)
    storage_cost: Decimal = Field(..., decimal_places=2)
    
    class Config:
        json_encoders = {Decimal: float}

class AuditLog(BaseModel):
    """Audit log entry."""
    timestamp: datetime
    user_id: str
    action: str  # "REPORT_GENERATED", "EXPORT_CREATED", "SETTINGS_CHANGED"
    resource_type: str  # "REPORT", "EXPORT", "ALERT"
    resource_id: str
    details: Optional[dict] = None
    status: str = "SUCCESS"  # "SUCCESS", "FAILED"
    result: Optional[dict] = None
```

### New File: `backend/app/db/database.py`

```python
"""
Database connection and initialization.
"""

import structlog
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = structlog.get_logger(__name__)

# Create database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db():
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error("database_error", error=str(e))
            raise
        finally:
            await session.close()

async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("database.initialized")

async def close_db():
    """Close database connections."""
    await engine.dispose()
    logger.info("database.closed")
```

### Update: `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost/kubecent",
        description="Database connection URL"
    )
    DB_ECHO: bool = Field(
        default=False,
        description="Log SQL queries"
    )
```

---

## 9. HIGH: Kubernetes Resource Limits

### File: `helm/kubecent/templates/backend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "kubecent.fullname" . }}-backend
  labels:
    {{- include "kubecent.labels" . | nindent 4 }}
    component: backend
spec:
  replicas: {{ .Values.backend.replicas | default 2 }}
  selector:
    matchLabels:
      {{- include "kubecent.selectorLabels" . | nindent 6 }}
      component: backend
  template:
    metadata:
      labels:
        {{- include "kubecent.selectorLabels" . | nindent 8 }}
        component: backend
    spec:
      serviceAccountName: {{ include "kubecent.serviceAccountName" . }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: backend
        image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
        imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
        ports:
        - name: http
          containerPort: 8000
          protocol: TCP
        env:
        - name: ENVIRONMENT
          value: {{ .Values.environment | quote }}
        - name: LOG_LEVEL
          value: {{ .Values.backend.logLevel | default "INFO" }}
        - name: CORS_ORIGINS
          value: {{ .Values.backend.corsOrigins | toJson | quote }}
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

---

## 10. HIGH: Network Policies

### New File: `helm/kubecent/templates/networkpolicies.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "kubecent.fullname" . }}
spec:
  podSelector:
    matchLabels:
      {{- include "kubecent.selectorLabels" . | nindent 6 }}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
    - protocol: TCP
      port: 3000
  # Allow health checks from kubelet
  - from:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 8000
  egress:
  # Allow to prometheus/opencost
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 9090
    - protocol: TCP
      port: 9003
  # Allow to DNS
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
  # Allow to external APIs (if needed)
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # Block metadata service
    ports:
    - protocol: TCP
      port: 443
```

---

## Implementation Checklist

```bash
# 1. Fix CORS configuration
[ ] Update backend/app/core/config.py
[ ] Update .env files for each environment

# 2. Fix authentication
[ ] Update backend/app/middleware/auth.py
[ ] Test authentication enforcement

# 3. Add input validation
[ ] Create backend/app/middleware/validation.py
[ ] Add to middleware stack

# 4. Add rate limiting
[ ] Create backend/app/middleware/rate_limit.py
[ ] Configure limits in settings

# 5. Add global exception handlers
[ ] Update backend/app/main.py
[ ] Test error handling

# 6. Implement database
[ ] Add PostgreSQL to deployment
[ ] Create database models
[ ] Implement migrations

# 7. Add resource limits
[ ] Update Helm templates
[ ] Test deployment with limits

# 8. Add network policies
[ ] Create network policy manifests
[ ] Test connectivity

# 9. Test all changes
[ ] Run security scan
[ ] Run load tests
[ ] Run integration tests

# 10. Documentation
[ ] Update deployment docs
[ ] Create runbooks
[ ] Update API docs
```

---

**Expected Timeline for Critical Fixes:** 1-2 weeks  
**Testing Required:** Full regression testing + security testing  
**Review Required:** Security team approval before production deployment
