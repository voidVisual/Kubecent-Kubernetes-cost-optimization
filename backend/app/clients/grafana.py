"""
Grafana client for health checks and API interactions.
"""

import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GrafanaClient:
    """Client for interacting with Grafana API."""
    
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize Grafana client.
        
        Args:
            base_url: Grafana base URL (defaults to settings)
            api_key: Grafana API key (optional, defaults to settings)
        """
        self.base_url = (base_url or settings.GRAFANA_URL or "").rstrip("/")
        self.api_key = api_key or settings.GRAFANA_API_KEY
        self.timeout = 10.0
        
    async def health_check(self) -> Dict[str, Any]:
        """
        Check Grafana health status.
        
        Returns:
            Dict containing health status and connection info
        """
        if not self.base_url:
            return {
                "connected": False,
                "status": "not_configured",
                "message": "Grafana URL not configured",
                "url": None
            }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Try to connect to Grafana health endpoint
                response = await client.get(
                    f"{self.base_url}/api/health",
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "connected": True,
                        "status": "healthy",
                        "message": "Grafana is accessible and healthy",
                        "url": self.base_url,
                        "version": data.get("version", "unknown"),
                        "database": data.get("database", "unknown")
                    }
                else:
                    return {
                        "connected": False,
                        "status": "unhealthy",
                        "message": f"Grafana returned status code {response.status_code}",
                        "url": self.base_url
                    }
                    
        except httpx.ConnectError:
            logger.warning(f"Cannot connect to Grafana at {self.base_url}")
            return {
                "connected": False,
                "status": "unreachable",
                "message": "Cannot connect to Grafana - service may not be running",
                "url": self.base_url
            }
        except httpx.TimeoutException:
            logger.warning(f"Timeout connecting to Grafana at {self.base_url}")
            return {
                "connected": False,
                "status": "timeout",
                "message": "Connection to Grafana timed out",
                "url": self.base_url
            }
        except Exception as e:
            logger.error(f"Error checking Grafana health: {str(e)}")
            return {
                "connected": False,
                "status": "error",
                "message": f"Error: {str(e)}",
                "url": self.base_url
            }
    
    async def get_dashboards(self) -> Dict[str, Any]:
        """
        Get list of available Grafana dashboards.
        
        Returns:
            Dict containing dashboard list or error info
        """
        if not self.base_url:
            return {"error": "Grafana URL not configured", "dashboards": []}
        
        try:
            # Use basic auth if no API key
            headers = {}
            auth = None
            
            if self.api_key and ":" in self.api_key:
                # Basic auth format: username:password
                import base64
                credentials = base64.b64encode(self.api_key.encode()).decode()
                headers["Authorization"] = f"Basic {credentials}"
            elif self.api_key:
                # API key format
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/search?type=dash-db",
                    headers=headers,
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    dashboards = response.json()
                    return {
                        "dashboards": [
                            {
                                "uid": d.get("uid"),
                                "title": d.get("title"),
                                "url": f"{self.base_url}/d/{d.get('uid')}",
                                "folder": d.get("folderTitle", "General")
                            }
                            for d in dashboards
                        ]
                    }
                else:
                    return {
                        "error": f"Failed to fetch dashboards: {response.status_code}",
                        "dashboards": []
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching Grafana dashboards: {str(e)}")
            return {"error": str(e), "dashboards": []}
    
    async def get_dashboard_links(self) -> Dict[str, str]:
        """
        Get predefined dashboard links for KubeCent.
        
        Returns:
            Dict mapping dashboard names to URLs
        """
        if not self.base_url:
            return {}
        
        base = self.base_url.rstrip("/")
        return {
            "cluster_overview": f"{base}/d/cluster-overview",
            "pod_metrics": f"{base}/d/pod-metrics",
            "cost_analysis": f"{base}/d/cost-analysis",
            "node_performance": f"{base}/d/node-performance"
        }


# Singleton instance
grafana_client = GrafanaClient()
