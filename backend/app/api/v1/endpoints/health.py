"""
Health check endpoint.

Provides service health status for readiness/liveness probes.
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    
    Verifies that both Kubecent backend and OpenCost are operational.
    
    Returns:
        {
            "status": "healthy",
            "opencost": "connected",
            "timestamp": "2024-01-08T12:34:56Z"
        }
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    
    # Check OpenCost connectivity
    opencost_healthy = await cost_service.get_health()
    
    return {
        "status": "healthy" if opencost_healthy else "degraded",
        "opencost": "connected" if opencost_healthy else "disconnected",
        "service": "kubecent-backend",
    }
