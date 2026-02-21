"""
OpenCost HTTP client with retry logic, timeouts, and error handling.

OpenCost API Reference: https://www.opencost.io/docs/api
This client communicates with OpenCost's allocation API to fetch cost data.
"""

import httpx
import structlog
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.exceptions import OpenCostException

logger = structlog.get_logger(__name__)


class OpenCostClient:
    """
    HTTP client for OpenCost API with built-in retries and error handling.
    
    OpenCost exposes cost allocation data through REST APIs.
    This client handles:
    - Cost allocation queries (namespace, pod, container level)
    - Automated retries with exponential backoff
    - Request/response timeouts
    - Error handling and logging
    """
    
    # Retry configuration
    MAX_RETRIES = 3
    INITIAL_RETRY_DELAY = 1  # seconds
    MAX_RETRY_DELAY = 10  # seconds
    REQUEST_TIMEOUT = 30  # seconds
    
    def __init__(self, base_url: str, timeout: int = REQUEST_TIMEOUT):
        """
        Initialize OpenCost client.
        
        Args:
            base_url: OpenCost API base URL (e.g., http://opencost:9003)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session: Optional[httpx.AsyncClient] = None
    
    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create async HTTP session."""
        if self._session is None:
            self._session = httpx.AsyncClient(timeout=self.timeout)
        return self._session
    
    async def close(self) -> None:
        """Close HTTP session gracefully."""
        if self._session:
            await self._session.aclose()
            self._session = None
    
    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=INITIAL_RETRY_DELAY, max=MAX_RETRY_DELAY),
        retry=retry_if_exception_type((httpx.HTTPError, TimeoutError)),
        reraise=True,
    )
    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        """
        Make HTTP request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Full URL to request
            **kwargs: Additional httpx parameters
            
        Returns:
            HTTP response
            
        Raises:
            OpenCostException: On final failure after retries
        """
        try:
            session = await self._get_session()
            response = await session.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as e:
            logger.error(
                "opencost.http_error",
                status_code=e.response.status_code,
                url=url,
                error=str(e),
            )
            raise
        except (httpx.RequestError, TimeoutError) as e:
            logger.warning(
                "opencost.request_error",
                url=url,
                error=str(e),
                attempt=self._request.statistics.get("attempt_number", 0),
            )
            raise
    
    async def health_check(self) -> bool:
        """
        Check OpenCost API health.
        
        OpenCost exposes /healthz endpoint for readiness checks.
        
        Returns:
            True if OpenCost is healthy, False otherwise
        """
        try:
            response = await self._request(
                "GET",
                f"{self.base_url}/healthz",
            )
            is_healthy = response.status_code == 200
            logger.info("opencost.health_check", healthy=is_healthy)
            return is_healthy
        except Exception as e:
            logger.warning("opencost.health_check_failed", error=str(e))
            return False
    
    async def get_allocation(
        self,
        aggregate: str = "namespace",
        window: str = "30d",
        idle: bool = False,
    ) -> Dict[str, Any]:
        """
        Fetch cost allocation data from OpenCost.
        
        OpenCost API: GET /api/v1/allocation
        
        The allocation API returns cost data aggregated by specified dimension.
        Each allocation includes:
        - CPU cost
        - Memory cost
        - Storage cost
        - Network cost
        - GPU cost
        - Total cost
        
        Args:
            aggregate: Aggregation level (cluster, node, namespace, pod, container)
            window: Time window (e.g., "30d", "24h", "current")
            idle: Include idle resources
            
        Returns:
            Raw allocation data from OpenCost
            
        Raises:
            OpenCostException: If API call fails
            
        Example response structure:
        {
            "code": 200,
            "data": [
                {
                    "name": "namespace-name",
                    "properties": {"cluster": "default", "namespace": "default"},
                    "window": {...},
                    "start": "2024-01-01T00:00:00Z",
                    "end": "2024-01-31T23:59:59Z",
                    "totalCost": 1000.00,
                    "cpuCost": 600.00,
                    "memoryCost": 300.00,
                    "storageCost": 50.00,
                    "networkCost": 50.00,
                    "values": {...}
                }
            ],
            "message": ""
        }
        """
        try:
            params = {
                "aggregate": aggregate,
                "window": window,
                "idle": idle,
            }
            
            logger.info(
                "opencost.allocation_request",
                aggregate=aggregate,
                window=window,
            )
            
            response = await self._request(
                "GET",
                f"{self.base_url}/allocation/compute",
                params=params,
            )
            
            data = response.json()
            
            # Log successful response
            item_count = len(data.get("data", []))
            logger.info(
                "opencost.allocation_success",
                aggregate=aggregate,
                item_count=item_count,
            )
            
            return data
            
        except Exception as e:
            logger.error(
                "opencost.allocation_error",
                aggregate=aggregate,
                error=str(e),
            )
            raise OpenCostException(
                f"Failed to fetch {aggregate} allocation: {str(e)}",
                code="OPENCOST_ALLOCATION_ERROR",
            )
    
    async def get_assets(self) -> Dict[str, Any]:
        """
        Fetch asset/compute resource data from OpenCost.
        
        OpenCost API: GET /api/v1/assets
        
        Assets include clusters, nodes, and storage resources.
        Useful for understanding infrastructure cost drivers.
        
        Returns:
            Raw asset data from OpenCost
        """
        try:
            logger.info("opencost.assets_request")
            
            response = await self._request(
                "GET",
                f"{self.base_url}/api/v1/assets",
            )
            
            data = response.json()
            logger.info("opencost.assets_success")
            
            return data
            
        except Exception as e:
            logger.error("opencost.assets_error", error=str(e))
            raise OpenCostException(
                f"Failed to fetch assets: {str(e)}",
                code="OPENCOST_ASSETS_ERROR",
            )

# Global OpenCost client instance
_opencost_client: Optional[OpenCostClient] = None


def get_opencost_client() -> OpenCostClient:
    """
    Get or create global OpenCost client.
    
    Uses OPENCOST_URL environment variable for base URL.
    Implements singleton pattern for connection pooling.
    
    Returns:
        OpenCostClient instance
    """
    global _opencost_client
    if _opencost_client is None:
        from app.core.config import settings
        _opencost_client = OpenCostClient(base_url=settings.OPENCOST_URL)
    return _opencost_client