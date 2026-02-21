"""Health check endpoints."""

from fastapi import APIRouter, Request
from datetime import datetime
from app.models.schemas import HealthCheck
from app.services.cost_service import OpenCostClient

health_router = APIRouter()


@health_router.get("/health", response_model=HealthCheck)
async def health_check(request: Request) -> HealthCheck:
    """
    Application health check endpoint.
    
    Returns status of all critical services.
    """
    opencost = OpenCostClient()
    
    checks = {
        "api": "healthy",
        "opencost": "healthy" if opencost.health_check() else "unhealthy",
    }
    
    overall_status = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"
    
    return HealthCheck(
        status=overall_status,
        version="0.1.0",
        checks=checks,
        timestamp=datetime.now(),
    )
