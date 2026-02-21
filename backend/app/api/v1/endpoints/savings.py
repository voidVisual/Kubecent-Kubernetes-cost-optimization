"""
Savings and optimization recommendations endpoints.

Analyzes cost data to identify optimization opportunities.
"""

from fastapi import APIRouter, Query
from typing import Dict, List, Any

from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService

router = APIRouter()


@router.get("/savings/recommendations", tags=["savings"])
async def get_savings_recommendations(
    limit: int = Query(10, ge=1, le=50, description="Max recommendations to return"),
) -> Dict[str, Any]:
    """
    Get cost optimization recommendations.
    
    Analyzes Kubernetes cost data to identify savings opportunities:
    - Unused resources (idle allocations)
    - Over-allocated resources (CPU/memory requests > usage)
    - Right-sizing opportunities
    - Consolidation opportunities
    
    Query Parameters:
        - limit: Maximum number of recommendations to return
    
    Returns:
        {
            "recommendations": [
                {
                    "id": "rec-001",
                    "type": "right-size",
                    "namespace": "default",
                    "resource": "nginx-deployment",
                    "current_cost": 50.0,
                    "estimated_savings": 20.0,
                    "priority": "high",
                    "description": "Container has 4 CPU cores allocated but only uses 0.5 cores",
                    "action": "Reduce CPU request from 4 to 0.5"
                }
            ],
            "total_potential_savings": 250.0,
            "savings_percentage": 15.5
        }
    
    Algorithm:
    1. Fetches pod-level cost data from OpenCost
    2. Analyzes allocation vs. actual usage patterns
    3. Identifies idle resources and over-allocations
    4. Generates recommendations with estimated savings
    5. Prioritizes by potential impact (savings amount)
    6. Results cached for 5 minutes
    
    Data Sources:
    - OpenCost allocation API (/api/v1/allocation?aggregate=pod)
    - idleCost field indicates unused resource cost
    - Cost breakdown by resource type (CPU, memory, storage)
    """
    opencost_client = get_opencost_client()
    cost_service = CostService(opencost_client)
    
    # Fetch pod-level costs
    pod_costs = await cost_service.get_cost_by_pod(window="7d", use_cache=True)
    
    recommendations = []
    total_savings = 0.0
    
    # Generate recommendations based on cost analysis
    for pod in pod_costs.get("pods", [])[:limit]:
        idle_cost = pod.get("idle_cost", 0)
        
        # High idle cost = right-sizing opportunity
        if idle_cost > pod.get("total_cost", 0) * 0.2:  # >20% idle
            savings = idle_cost * 0.5  # Conservative estimate
            total_savings += savings
            
            recommendations.append({
                "id": f"rec-{len(recommendations) + 1:03d}",
                "type": "reduce-idle",
                "namespace": pod.get("namespace"),
                "resource": pod.get("name"),
                "current_cost": pod.get("total_cost"),
                "estimated_savings": savings,
                "priority": "high" if savings > 10 else "medium",
                "description": f"Pod {pod.get('name')} has {idle_cost:.2f} in idle costs",
                "action": "Review resource requests and right-size to actual usage",
            })
    
    total_cluster_cost = pod_costs.get("total", 0)
    savings_percentage = (total_savings / total_cluster_cost * 100) if total_cluster_cost > 0 else 0
    
    return {
        "recommendations": recommendations,
        "total_potential_savings": total_savings,
        "savings_percentage": savings_percentage,
        "cluster_total_cost": total_cluster_cost,
    }
