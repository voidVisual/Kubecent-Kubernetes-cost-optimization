"""
Main FastAPI application entry point.

This module initializes and configures the FastAPI application with:
- Custom middleware (RBAC, logging, CORS)
- API routers
- Exception handlers
- Health check endpoints
- OpenCost client initialization
"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.auth import RBACMiddleware
from app.middleware.logging import LoggingMiddleware
from app.api.v1.router import api_router
from app.api.dashboard import router as dashboard_router
from app.api.monitoring import router as monitoring_router
from app.clients.opencost import get_opencost_client
from app.services.background_tasks import start_background_tasks

# Initialize logger
logger = structlog.get_logger(__name__)

__version__ = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle events.
    
    Startup:
    - Initialize resources
    - Check OpenCost connectivity
    - Verify configuration
    
    Shutdown:
    - Close OpenCost client
    - Clean up resources gracefully
    """
    logger.info("application.startup", version=__version__)
    
    # Initialize OpenCost client on startup
    try:
        opencost_client = get_opencost_client()
        is_healthy = await opencost_client.health_check()
        if is_healthy:
            logger.info("opencost.ready")
        else:
            logger.warning("opencost.unhealthy")
    except Exception as e:
        logger.error("opencost.initialization_failed", error=str(e))
    
    # Start background cache refresh tasks
    try:
        await start_background_tasks()
    except Exception as e:
        logger.error("background.tasks_failed", error=str(e))
    
    yield
    
    logger.info("application.shutdown")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Configuration includes:
    - Lifespan events (startup/shutdown)
    - Middleware stack (logging, RBAC, CORS)
    - API routers (v1 endpoints)
    - Exception handlers
    - OpenAPI documentation
    
    Returns:
        FastAPI: Configured application instance
    """
    app = FastAPI(
        title="Kubecent",
        description="In-cluster Kubernetes cost optimization platform with OpenCost integration",
        version=__version__,
        lifespan=lifespan,
        docs_url="/api/docs" if settings.ENABLE_SWAGGER else None,
        openapi_url="/api/openapi.json" if settings.ENABLE_SWAGGER else None,
    )
    
    # Setup logging
    setup_logging()
    
    # Add middleware (order matters - outermost last)
    # 1. CORS (outermost)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 2. RBAC
    app.add_middleware(RBACMiddleware, settings=settings)
    
    # 3. Logging (innermost - processes all requests)
    app.add_middleware(LoggingMiddleware)
    
    # Include API routers
    # Dashboard routes: /api/allocations, /api/assets, /api/idle, etc.
    app.include_router(dashboard_router, prefix="/api", tags=["dashboard"])
    
    # Monitoring routes: /api/monitoring/*
    app.include_router(monitoring_router, prefix="/api/monitoring", tags=["monitoring"])
    
    # API v1 routes: /api/v1/cost/*, /api/v1/health, /api/v1/savings/*
    app.include_router(api_router, prefix="/api")
    
    logger.info("application.initialized", debug=settings.DEBUG, opencost_url=settings.OPENCOST_URL)
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
