"""
Cost analysis service.

Orchestrates OpenCost client and cache to fetch, normalize, and aggregate
Kubernetes cost data. Exposes high-level operations for cost querying.
"""

import structlog
from typing import Dict, List, Any, Optional
from decimal import Decimal

from app.clients.opencost import OpenCostClient
from app.services.cache import get_cache_manager
from app.core.exceptions import OpenCostException

logger = structlog.get_logger(__name__)


class CostService:
    """
    Service for cost analysis and aggregation.
    
    Maps OpenCost API responses to Kubecent data model:
    - OpenCost returns allocation data with namespace/pod/container granularity
    - Maps to standardized Kubecent cost schema
    - Aggregates across requested dimensions (namespace, pod, etc.)
    - Caches responses to minimize OpenCost API load
    """
    
    def __init__(self, opencost_client: OpenCostClient):
        """
        Initialize cost service.
        
        Args:
            opencost_client: Client for OpenCost API communication
        """
        self.client = opencost_client
        self.cache = get_cache_manager()
    
    async def get_health(self) -> bool:
        """
        Check OpenCost service health.
        
        Returns:
            True if OpenCost is healthy and reachable
        """
        try:
            is_healthy = await self.client.health_check()
            logger.info("cost.health_check", healthy=is_healthy)
            return is_healthy
        except OpenCostException as e:
            logger.warning("cost.health_check_failed", error=str(e))
            return False
    
    async def get_cluster_cost(
        self,
        window: str = "7d",
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated cluster-wide cost data.
        
        Returns total cluster costs with namespace and pod counts.
        
        Args:
            window: Time window for cost query (e.g., "7d", "30d")
            use_cache: Use cached data if available
            
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
        from datetime import datetime
        
        cache_key = f"cost:cluster:{window}"
        
        async def fetch():
            logger.debug("cost.fetch_cluster", window=window)
            
            try:
                # Fetch allocation data from OpenCost aggregated by namespace
                allocation = await self.client.get_allocation(
                    aggregate="namespace",
                    window=window,
                    idle=False,
                )
                
                # Extract and aggregate costs
                total_cpu = 0.0
                total_memory = 0.0
                total_storage = 0.0
                total_network = 0.0
                namespace_count = 0
                pod_count = 0
                
                if "data" in allocation:
                    for item in allocation["data"]:
                        namespace_count += 1
                        total_cpu += float(item.get("cpuCost", 0))
                        total_memory += float(item.get("ramCost", 0))
                        total_storage += float(item.get("pvCost", 0))
                        total_network += float(item.get("networkCost", 0))
                        pod_count += int(item.get("properties", {}).get("pods", 0))
                
                total = total_cpu + total_memory + total_storage + total_network
                
                return {
                    "cluster_name": "kubecent-cluster",
                    "namespaces": namespace_count,
                    "pods": pod_count,
                    "allocation": {
                        "cpu_cost": round(total_cpu, 2),
                        "memory_cost": round(total_memory, 2),
                        "storage_cost": round(total_storage, 2),
                        "network_cost": round(total_network, 2),
                        "total_cost": round(total, 2),
                    },
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            except Exception as e:
                logger.error("cost.cluster_fetch_failed", error=str(e))
                raise OpenCostException(f"Failed to fetch cluster cost: {str(e)}")
        
        if use_cache:
            return await self.cache.get_or_set(cache_key, fetch, ttl=300)
        return await fetch()
    
    async def get_cost_by_namespace(
        self,
        window: str = "7d",
        idle: bool = False,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated costs by Kubernetes namespace.
        
        Maps OpenCost allocation response to namespace-level aggregation:
        - OpenCost returns: properties.namespace, totalCost, idleTime
        - Kubecent returns: namespace, cost, cpuCost, memCost, storage, idle
        
        Args:
            window: Time window for cost query (e.g., "7d", "30d")
            idle: Include idle cost allocation
            use_cache: Use cached data if available
            
        Returns:
            Dictionary with namespace costs:
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
                "window": "7d"
            }
        """
        cache_key = f"cost:namespaces:{window}:idle={idle}"
        
        async def fetch():
            logger.debug("cost.fetch_by_namespace", window=window, idle=idle)
            
            try:
                # Fetch allocation data from OpenCost
                # OpenCost allocations include: namespace, pod, container dimensions
                allocation = await self.client.get_allocation(
                    aggregate="namespace",
                    window=window,
                    idle=idle,
                )
                
                # Normalize OpenCost response to Kubecent format
                return self._normalize_namespace_costs(allocation, window)
            except OpenCostException as e:
                logger.error("cost.fetch_failed", window=window, error=str(e))
                raise
        
        if use_cache:
            return await self.cache.get_or_set(cache_key, fetch)
        else:
            return await fetch()
    
    async def get_cost_by_pod(
        self,
        namespace: Optional[str] = None,
        window: str = "7d",
        idle: bool = False,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated costs by Kubernetes pod.
        
        Maps OpenCost allocation data to pod-level view:
        - Filters to specific namespace if provided
        - Sums costs across containers in each pod
        
        Args:
            namespace: Optional namespace to filter pods
            window: Time window for cost query
            idle: Include idle cost
            use_cache: Use cached data if available
            
        Returns:
            Dictionary with pod costs:
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
                "window": "7d"
            }
        """
        cache_key = f"cost:pods:{namespace}:{window}:idle={idle}"
        
        async def fetch():
            logger.debug(
                "cost.fetch_by_pod",
                namespace=namespace,
                window=window,
                idle=idle,
            )
            
            try:
                # Fetch pod-level allocation from OpenCost
                allocation = await self.client.get_allocation(
                    aggregate="pod",
                    window=window,
                    idle=idle,
                )
                
                # Normalize and optionally filter by namespace
                return self._normalize_pod_costs(allocation, namespace, window)
            except OpenCostException as e:
                logger.error("cost.fetch_failed", namespace=namespace, error=str(e))
                raise
        
        if use_cache:
            return await self.cache.get_or_set(cache_key, fetch)
        else:
            return await fetch()
    
    async def get_monthly_cost(
        self,
        months: int = 1,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated monthly cost trends.
        
        Fetches last N months of cost data for trend analysis:
        - Uses 30d window to get monthly spend
        - Can be called repeatedly for historical data
        
        Args:
            months: Number of months to aggregate (default 1 for current month)
            use_cache: Use cached data if available
            
        Returns:
            Dictionary with monthly costs:
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
        """
        cache_key = f"cost:monthly:{months}m"
        
        async def fetch():
            logger.debug("cost.fetch_monthly", months=months)
            
            try:
                # Use 30d window for monthly costs
                allocation = await self.client.get_allocation(
                    aggregate="namespace",
                    window="30d",
                    idle=False,
                )
                
                return self._normalize_monthly_costs(allocation)
            except OpenCostException as e:
                logger.error("cost.fetch_monthly_failed", error=str(e))
                raise
        
        if use_cache:
            return await self.cache.get_or_set(cache_key, fetch)
        else:
            return await fetch()
    
    # ============================================================================
    # Response Normalization Helpers
    # ============================================================================
    
    def _normalize_namespace_costs(
        self,
        allocation: Dict[str, Any],
        window: str,
    ) -> Dict[str, Any]:
        """
        Normalize OpenCost namespace allocation response to Kubecent format.
        
        OpenCost allocation structure for aggregate="namespace":
        {
            "data": [
                {
                    "name": "default",
                    "properties": {
                        "namespace": "default"
                    },
                    "window": {
                        "start": "2024-01-01T00:00:00Z",
                        "end": "2024-01-08T00:00:00Z"
                    },
                    "cpuCost": 10.5,
                    "memoryAllocatableCost": 5.25,
                    "storageAllocatableCost": 2.10,
                    "totalCost": 17.85,
                    "idleTime": 0.5
                }
            ]
        }
        
        Kubecent normalization:
        - Extract properties.namespace as name
        - Map cpuCost -> cpu_cost
        - Map memoryAllocatableCost -> memory_cost
        - Map storageAllocatableCost -> storage_cost
        - Sum totalCost
        """
        namespaces = []
        total = Decimal("0")
        
        # Extract namespace allocations from OpenCost response
        items = allocation.get("data", [])
        
        for item in items:
            if not item.get("properties", {}).get("namespace"):
                continue
            
            ns_name = item["properties"]["namespace"]
            cpu_cost = Decimal(str(item.get("cpuCost", 0)))
            mem_cost = Decimal(str(item.get("memoryAllocatableCost", 0)))
            storage_cost = Decimal(str(item.get("storageAllocatableCost", 0)))
            total_cost = Decimal(str(item.get("totalCost", 0)))
            idle_cost = Decimal(str(item.get("idleCost", 0)))
            
            total += total_cost
            
            namespaces.append({
                "name": ns_name,
                "total_cost": float(total_cost),
                "cpu_cost": float(cpu_cost),
                "memory_cost": float(mem_cost),
                "storage_cost": float(storage_cost),
                "idle_cost": float(idle_cost),
                "pod_count": item.get("podCount", 0),
            })
        
        return {
            "namespaces": namespaces,
            "total": float(total),
            "window": window,
            "item_count": len(namespaces),
        }
    
    def _normalize_pod_costs(
        self,
        allocation: Dict[str, Any],
        namespace: Optional[str],
        window: str,
    ) -> Dict[str, Any]:
        """
        Normalize OpenCost pod allocation response to Kubecent format.
        
        Similar structure to namespace but with pod granularity.
        Optionally filters to specific namespace.
        """
        pods = []
        total = Decimal("0")
        
        items = allocation.get("data", [])
        
        for item in items:
            props = item.get("properties", {})
            item_ns = props.get("namespace")
            item_pod = props.get("pod")
            
            if not item_pod:
                continue
            
            # Filter by namespace if specified
            if namespace and item_ns != namespace:
                continue
            
            cpu_cost = Decimal(str(item.get("cpuCost", 0)))
            mem_cost = Decimal(str(item.get("memoryAllocatableCost", 0)))
            storage_cost = Decimal(str(item.get("storageAllocatableCost", 0)))
            total_cost = Decimal(str(item.get("totalCost", 0)))
            
            total += total_cost
            
            pods.append({
                "namespace": item_ns,
                "name": item_pod,
                "total_cost": float(total_cost),
                "cpu_cost": float(cpu_cost),
                "memory_cost": float(mem_cost),
                "storage_cost": float(storage_cost),
            })
        
        result = {
            "pods": pods,
            "total": float(total),
            "window": window,
            "item_count": len(pods),
        }
        
        if namespace:
            result["namespace"] = namespace
        
        return result
    
    def _normalize_monthly_costs(
        self,
        allocation: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Normalize allocation response for monthly trend analysis.
        
        Aggregates namespace costs into monthly view.
        """
        months = []
        total = Decimal("0")
        
        items = allocation.get("data", [])
        
        # Simple monthly aggregation (in real implementation, would aggregate by month)
        monthly_total = Decimal("0")
        namespace_count = set()
        
        for item in items:
            total_cost = Decimal(str(item.get("totalCost", 0)))
            monthly_total += total_cost
            total += total_cost
            
            ns = item.get("properties", {}).get("namespace")
            if ns:
                namespace_count.add(ns)
        
        # Create single month entry (would be multiple for historical data)
        if items:
            months.append({
                "month": "2024-01",
                "total_cost": float(monthly_total),
                "daily_average": float(monthly_total / 30),
                "namespaces": len(namespace_count),
                "pods": len(items),
            })
        
        return {
            "months": months,
            "total": float(total),
            "period": "1 month",
        }


async def get_cost_service(opencost_client: OpenCostClient) -> CostService:
    """Dependency injection helper for cost service."""
    return CostService(opencost_client)
