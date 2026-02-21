"""
Grafana monitoring endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.clients.grafana import grafana_client
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/grafana", tags=["grafana"])


@router.get("/health", response_model=Dict[str, Any])
async def get_grafana_health():
    """
    Check Grafana connection status.
    
    Returns:
        Grafana health status and connection information
    """
    try:
        health = await grafana_client.health_check()
        return health
    except Exception as e:
        logger.error(f"Error checking Grafana health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboards", response_model=Dict[str, Any])
async def get_grafana_dashboards():
    """
    Get available Grafana dashboards.
    
    Returns:
        List of available dashboards with URLs
    """
    try:
        dashboards = await grafana_client.get_dashboards()
        return dashboards
    except Exception as e:
        logger.error(f"Error fetching Grafana dashboards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/links", response_model=Dict[str, str])
async def get_dashboard_links():
    """
    Get predefined KubeCent dashboard links.
    
    Returns:
        Dictionary mapping dashboard names to URLs
    """
    try:
        links = await grafana_client.get_dashboard_links()
        return links
    except Exception as e:
        logger.error(f"Error getting dashboard links: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
