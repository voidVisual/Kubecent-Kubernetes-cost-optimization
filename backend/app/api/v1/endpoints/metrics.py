"""
API endpoints for metrics and resource efficiency monitoring.

Provides real-time and historical metrics for Kubernetes resources.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional, List
from app.models.schemas import (
    PodMetrics,
    NodeMetrics,
    ResourceEfficiency,
    BudgetAlert,
    TimeSeriesData,
)
from app.services.metrics_service import MetricsService
from app.core.config import settings

router = APIRouter(prefix="/metrics", tags=["metrics"])
metrics_service = MetricsService(settings.PROMETHEUS_URL)


@router.get("/pods", response_model=List[PodMetrics])
async def get_pod_metrics(namespace: Optional[str] = Query(None)):
    """
    Get current metrics for all pods or a specific namespace.
    
    **Parameters:**
    - namespace: Optional namespace filter
    
    **Returns:**
    - List of pod metrics with CPU, memory, and network usage
    """
    try:
        metrics = await metrics_service.get_pod_metrics(namespace)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nodes", response_model=List[NodeMetrics])
async def get_node_metrics():
    """
    Get current metrics for all nodes.
    
    **Returns:**
    - List of node metrics including capacity and utilization
    """
    try:
        metrics = await metrics_service.get_node_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/efficiency", response_model=ResourceEfficiency)
async def get_resource_efficiency(namespace: Optional[str] = Query(None)):
    """
    Get resource efficiency metrics.
    
    Analyzes the gap between requested and actual resource usage
    to identify optimization opportunities.
    
    **Parameters:**
    - namespace: Optional namespace filter
    
    **Returns:**
    - Resource efficiency scores and recommendations
    """
    try:
        efficiency = await metrics_service.get_resource_efficiency(namespace)
        return efficiency
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends", response_model=List[TimeSeriesData])
async def get_cost_trends(
    period: str = Query("daily", regex="^(hourly|daily|weekly|monthly)$"),
    days: int = Query(30, ge=1, le=365),
    namespace: Optional[str] = Query(None),
):
    """
    Get historical cost trends.
    
    **Parameters:**
    - period: Aggregation period (hourly, daily, weekly, monthly)
    - days: Number of days to look back (default: 30)
    - namespace: Optional namespace filter
    
    **Returns:**
    - Time series data for cost analysis
    """
    try:
        # Mock implementation
        data = [
            {
                "metric_name": "cluster_cost",
                "resource": "total",
                "data_points": [
                    {
                        "timestamp": datetime.utcnow() - timedelta(days=i),
                        "value": 1500 + (i * 20),  # Mock increasing trend
                    }
                    for i in range(days)
                ],
            }
        ]
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budget-alerts", response_model=List[BudgetAlert])
async def get_budget_alerts(
    severity: Optional[str] = Query(None, regex="^(info|warning|critical)$"),
):
    """
    Get active budget alerts.
    
    **Parameters:**
    - severity: Filter by alert severity (info, warning, critical)
    
    **Returns:**
    - List of active budget alerts
    """
    try:
        # Mock implementation
        alerts = [
            {
                "alert_id": "alert-1",
                "namespace": "production",
                "budget_limit": 5000,
                "current_spend": 4200,
                "percentage": 84.0,
                "severity": "warning",
                "message": "Namespace production is at 84% of monthly budget",
                "created_at": datetime.utcnow(),
            },
            {
                "alert_id": "alert-2",
                "namespace": "development",
                "budget_limit": 1000,
                "current_spend": 950,
                "percentage": 95.0,
                "severity": "critical",
                "message": "Namespace development is at 95% of monthly budget",
                "created_at": datetime.utcnow(),
            },
        ]
        
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
        
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
