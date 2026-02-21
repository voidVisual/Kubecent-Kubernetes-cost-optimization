"""API V1 router and endpoint aggregation."""

from fastapi import APIRouter
from app.api.v1.endpoints import costs, optimizations

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(costs.router, prefix="/costs", tags=["costs"])
api_router.include_router(optimizations.router, prefix="/optimizations", tags=["optimizations"])
