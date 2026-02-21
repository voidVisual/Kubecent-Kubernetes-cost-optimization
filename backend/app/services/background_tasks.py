"""
Background tasks for periodic cache refresh.

Ensures cache stays warm and prevents cache misses by refreshing
cost data before TTL expiration.
"""

import asyncio
import structlog
from datetime import datetime, timedelta

from app.clients.opencost import get_opencost_client
from app.services.cost_service import CostService
from app.services.cache import get_cache_manager

logger = structlog.get_logger(__name__)


async def refresh_namespace_costs_task():
    """
    Background task to refresh namespace cost cache.
    
    Runs periodically to keep cache warm.
    Prevents cache misses by refreshing before TTL expiration.
    
    Execution Flow:
    1. Check if cache entry is about to expire (<60 seconds remaining)
    2. If expired/expiring, fetch fresh data from OpenCost
    3. Update cache with new data
    4. Log refresh metrics
    """
    try:
        opencost_client = get_opencost_client()
        cost_service = CostService(opencost_client)
        cache = get_cache_manager()
        
        # Refresh multiple time windows
        for window in ["7d", "30d"]:
            cache_key = f"cost:namespaces:{window}:idle=False"
            
            # Fetch fresh data
            costs = await cost_service.get_cost_by_namespace(window=window, use_cache=False)
            
            # Update cache
            await cache.set(cache_key, costs, ttl=300)  # 5 minutes
            
            logger.info("background.cache_refresh", window=window, item_count=len(costs.get("namespaces", [])))
            
    except Exception as e:
        logger.error("background.refresh_failed", error=str(e), task="namespace_costs")


async def refresh_pod_costs_task():
    """
    Background task to refresh pod cost cache.
    
    Ensures pod-level cost data is fresh in cache.
    """
    try:
        opencost_client = get_opencost_client()
        cost_service = CostService(opencost_client)
        cache = get_cache_manager()
        
        # Refresh pod data for multiple windows
        for window in ["7d", "30d"]:
            cache_key = f"cost:pods:None:{window}:idle=False"
            
            # Fetch fresh pod costs
            costs = await cost_service.get_cost_by_pod(window=window, use_cache=False)
            
            # Update cache
            await cache.set(cache_key, costs, ttl=300)
            
            logger.info("background.cache_refresh", window=window, pod_count=len(costs.get("pods", [])))
            
    except Exception as e:
        logger.error("background.refresh_failed", error=str(e), task="pod_costs")


async def cleanup_expired_cache_task():
    """
    Background task to clean up expired cache entries.
    
    Runs periodically to remove stale entries and free memory.
    """
    try:
        cache = get_cache_manager()
        removed = await cache.cleanup_expired()
        
        if removed > 0:
            logger.info("background.cache_cleanup", removed_count=removed)
            
    except Exception as e:
        logger.error("background.cleanup_failed", error=str(e))


async def start_background_tasks():
    """
    Start all background refresh tasks.
    
    Creates asyncio tasks that run in the background.
    Should be called during application startup.
    """
    logger.info("background.tasks_starting")
    
    # Create tasks that run indefinitely
    # Refresh every 4 minutes (TTL is 5 minutes, so we refresh before expiration)
    asyncio.create_task(_refresh_loop(refresh_namespace_costs_task, interval=240))
    asyncio.create_task(_refresh_loop(refresh_pod_costs_task, interval=240))
    asyncio.create_task(_cleanup_loop(cleanup_expired_cache_task, interval=300))
    
    logger.info("background.tasks_started")


async def _refresh_loop(task_func, interval: int):
    """
    Infinite loop that runs a task at regular intervals.
    
    Args:
        task_func: Async function to call
        interval: Interval between calls in seconds
    """
    while True:
        try:
            await asyncio.sleep(interval)
            await task_func()
        except asyncio.CancelledError:
            logger.info("background.task_cancelled")
            break
        except Exception as e:
            logger.error("background.task_error", error=str(e), task=task_func.__name__)
            # Continue on error - don't stop the loop


async def _cleanup_loop(task_func, interval: int):
    """
    Infinite loop for cleanup tasks.
    
    Args:
        task_func: Async function to call
        interval: Interval between calls in seconds
    """
    while True:
        try:
            await asyncio.sleep(interval)
            await task_func()
        except asyncio.CancelledError:
            logger.info("background.cleanup_cancelled")
            break
        except Exception as e:
            logger.error("background.cleanup_error", error=str(e))
