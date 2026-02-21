"""
Optimization recommendations endpoints.

Provides endpoints for cost optimization analysis and recommendations.
"""

import structlog
from typing import Optional
from fastapi import APIRouter, Query, Request, HTTPException

from app.models.schemas import OptimizationReport
from app.services.cost_service import CostService
from app.services.optimization_service import OptimizationService
from app.core.exceptions import OpenCostException

router = APIRouter()
logger = structlog.get_logger(__name__)

# Singleton service instances
_cost_service: Optional[CostService] = None
_optimization_service: Optional[OptimizationService] = None


def get_optimization_service() -> OptimizationService:
    """Get or create optimization service instance."""
    global _cost_service, _optimization_service
    if _cost_service is None:
        _cost_service = CostService()
    if _optimization_service is None:
        _optimization_service = OptimizationService(_cost_service)
    return _optimization_service


@router.get(
    "/report",
    response_model=OptimizationReport,
    summary="Get optimization recommendations",
)
async def get_optimization_report(
    request: Request,
    start_time: Optional[str] = Query(None, description="ISO 8601 start time"),
    end_time: Optional[str] = Query(None, description="ISO 8601 end time"),
) -> OptimizationReport:
    """
    Generate optimization recommendations report.
    
    Analyzes cost patterns and generates actionable recommendations for:
    - Removing idle pods
    - Rightsizing resource requests
    - Consolidating workloads
    
    Args:
        start_time: Optional start time for analysis period
        end_time: Optional end time for analysis period
        
    Returns:
        OptimizationReport with suggestions and estimated savings
        
    Raises:
        HTTPException: If analysis fails
    """
    try:
        service = get_optimization_service()
        report = service.generate_report(
            start_time=start_time,
            end_time=end_time,
        )
        logger.info(
            "endpoint.optimization_report.success",
            suggestions=report.total_suggestions,
            estimated_savings=report.estimated_total_savings,
            user=getattr(request.state, "user", None),
        )
        return report
    except OpenCostException as e:
        logger.error("endpoint.optimization_report.failed", error=e.message)
        raise HTTPException(status_code=503, detail=e.message)
    except Exception as e:
        logger.error("endpoint.optimization_report.error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate report")
