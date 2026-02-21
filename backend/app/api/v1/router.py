"""
API v1 router aggregation.

Combines all v1 endpoint routers for cost, health, and savings endpoints.
"""

from fastapi import APIRouter

# Import endpoint routers
from app.api.v1.endpoints import costs, health, savings, metrics, optimizations, grafana

# Create main v1 router
api_router = APIRouter(prefix="/v1")

# Include endpoint routers with prefixes
api_router.include_router(health.router)
api_router.include_router(costs.router, prefix="/cost", tags=["costs"])
api_router.include_router(savings.router, tags=["savings"])
api_router.include_router(metrics.router, tags=["metrics"])
api_router.include_router(optimizations.router, prefix="/optimizations", tags=["optimizations"])
api_router.include_router(grafana.router, tags=["grafana"])

__all__ = ["api_router"]
