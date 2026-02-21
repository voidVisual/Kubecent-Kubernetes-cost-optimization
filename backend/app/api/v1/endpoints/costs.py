"""
Cost endpoints for Kubecent API.

Exposes cost data aggregated by namespace, pod, and time period.
All responses cached for 5 minutes to reduce OpenCost API load.
"""

from fastapi import APIRouter, Query, Depends
from typing import Dict, Any, Optional

from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService

router = APIRouter()


@router.get("/cluster", tags=["costs"])
async def get_cluster_cost(
    window: str = Query("7d", description="Time window: 7d, 30d, 90d"),
) -> Dict[str, Any]:
    """
    Get aggregated cluster-wide cost data.
    
    Returns total cluster costs with namespace and pod counts.
    
    Query Parameters:
        - window: Time window for aggregation (7d, 30d, 90d)
    
    Returns:
        {
            "cluster_name": "kubecent-cluster",
            "namespaces": 5,
            "pods": 48,
            "allocation": {
                "cpu_cost": 100.50,
                "memory_cost": 75.25,
                "storage_cost": 50.00,
                "network_cost": 10.00,
                "total_cost": 235.75
            },
            "timestamp": "2026-02-11T12:00:00Z"
        }
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    return await cost_service.get_cluster_cost(window=window)


@router.get("/namespaces", tags=["costs"])
async def get_namespace_costs(
    window: str = Query("7d", description="Time window: 7d, 30d, 90d"),
    idle: bool = Query(False, description="Include idle costs"),
) -> Dict[str, Any]:
    """
    Get costs aggregated by Kubernetes namespace.
    
    Returns namespace-level cost breakdown with CPU, memory, and storage costs.
    
    Query Parameters:
        - window: Time window for aggregation (7d, 30d, 90d)
        - idle: Include idle cost allocation
    
    Returns:
        {
            "namespaces": [
                {
                    "name": "default",
                    "total_cost": 123.45,
                    "cpu_cost": 50.0,
                    "memory_cost": 30.0,
                    "storage_cost": 40.0,
                    "pod_count": 5,
                    "idle_cost": 3.45
                }
            ],
            "total": 123.45,
            "window": "7d",
            "item_count": 1
        }
    
    Data Mapping from OpenCost:
    - OpenCost /api/v1/allocation?aggregate=namespace returns allocation data
    - Each namespace item contains:
      - properties.namespace: Kubernetes namespace name
      - cpuCost: CPU allocation cost
      - memoryAllocatableCost: Memory allocation cost
      - storageAllocatableCost: Storage allocation cost
      - totalCost: Sum of all cost components
      - idleCost: Cost of unused allocated resources
    - Response is cached for 5 minutes (300 seconds)
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    return await cost_service.get_cost_by_namespace(window=window, idle=idle)


@router.get("/pods", tags=["costs"])
async def get_pod_costs(
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    window: str = Query("7d", description="Time window: 7d, 30d, 90d"),
    idle: bool = Query(False, description="Include idle costs"),
) -> Dict[str, Any]:
    """
    Get costs aggregated by Kubernetes pod.
    
    Returns pod-level cost breakdown, optionally filtered by namespace.
    
    Query Parameters:
        - namespace: Optional namespace to filter pods
        - window: Time window for aggregation
        - idle: Include idle cost allocation
    
    Returns:
        {
            "pods": [
                {
                    "namespace": "default",
                    "name": "nginx-123abc",
                    "total_cost": 45.67,
                    "cpu_cost": 20.0,
                    "memory_cost": 15.0,
                    "storage_cost": 10.67
                }
            ],
            "namespace": "default" (if filtered),
            "total": 45.67,
            "window": "7d",
            "item_count": 1
        }
    
    Data Mapping from OpenCost:
    - OpenCost /api/v1/allocation?aggregate=pod returns pod-level allocations
    - Each pod item contains:
      - properties.namespace: Pod's namespace
      - properties.pod: Pod name
      - cpuCost, memoryAllocatableCost, storageAllocatableCost: Resource costs
      - totalCost: Aggregated pod cost
    - Kubecent normalizes to pod-level view
    - Response is cached for 5 minutes
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    return await cost_service.get_cost_by_pod(namespace=namespace, window=window, idle=idle)


@router.get("/monthly", tags=["costs"])
async def get_monthly_cost() -> Dict[str, Any]:
    """
    Get aggregated monthly cost trends.
    
    Returns cost data for trend analysis and forecasting.
    Uses 30-day window for monthly spend calculation.
    
    Returns:
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
    
    Data Mapping from OpenCost:
    - Fetches allocation data with aggregate=namespace and window=30d
    - Aggregates totalCost across all namespaces for monthly total
    - Calculates daily average: monthly_total / 30
    - Counts unique namespaces and pods in the cluster
    - Response is cached for 5 minutes for dashboard performance
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    return await cost_service.get_monthly_cost()
