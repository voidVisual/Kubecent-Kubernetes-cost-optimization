"""
In-memory cache with TTL-based expiration.

Caches OpenCost responses for 5 minutes to reduce API load.
"""

import asyncio
import structlog
from typing import Dict, Any, Optional, TypeVar, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = structlog.get_logger(__name__)

T = TypeVar("T")


@dataclass
class CacheEntry:
    """Single cache entry with metadata."""
    
    data: Any
    created_at: datetime = field(default_factory=datetime.now)
    ttl_seconds: int = 300  # 5 minutes default
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        age = (datetime.now() - self.created_at).total_seconds()
        return age > self.ttl_seconds
    
    def age_seconds(self) -> float:
        """Get entry age in seconds."""
        return (datetime.now() - self.created_at).total_seconds()


class CacheManager:
    """
    Thread-safe in-memory cache with TTL-based expiration.
    
    Features:
    - Automatic expiration after TTL
    - Optional background refresh
    - Hit/miss tracking
    - Thread-safe operations
    """
    
    def __init__(self, default_ttl: int = 300):
        """
        Initialize cache manager.
        
        Args:
            default_ttl: Default TTL in seconds (300 = 5 minutes)
        """
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()
        self.default_ttl = default_ttl
        self._stats = {
            "hits": 0,
            "misses": 0,
            "expired": 0,
        }
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        async with self._lock:
            if key not in self._cache:
                self._stats["misses"] += 1
                logger.debug("cache.miss", key=key)
                return None
            
            entry = self._cache[key]
            
            if entry.is_expired():
                del self._cache[key]
                self._stats["expired"] += 1
                logger.debug("cache.expired", key=key, age_seconds=entry.age_seconds())
                return None
            
            self._stats["hits"] += 1
            logger.debug("cache.hit", key=key, age_seconds=entry.age_seconds())
            return entry.data
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Set value in cache with optional TTL override.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional TTL in seconds (uses default if not specified)
        """
        async with self._lock:
            ttl_to_use = ttl or self.default_ttl
            self._cache[key] = CacheEntry(data=value, ttl_seconds=ttl_to_use)
            logger.debug("cache.set", key=key, ttl_seconds=ttl_to_use)
    
    async def delete(self, key: str) -> bool:
        """
        Delete cache entry.
        
        Args:
            key: Cache key
            
        Returns:
            True if entry existed, False otherwise
        """
        async with self._lock:
            existed = key in self._cache
            if existed:
                del self._cache[key]
                logger.debug("cache.delete", key=key)
            return existed
    
    async def clear(self) -> int:
        """
        Clear all cache entries.
        
        Returns:
            Number of entries cleared
        """
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info("cache.cleared", count=count)
            return count
    
    async def cleanup_expired(self) -> int:
        """
        Remove all expired entries.
        
        Returns:
            Number of entries removed
        """
        async with self._lock:
            expired_keys = [
                k for k, v in self._cache.items()
                if v.is_expired()
            ]
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.info("cache.cleanup", removed_count=len(expired_keys))
            
            return len(expired_keys)
    
    async def get_or_set(
        self,
        key: str,
        fetch_func: Callable[[], Any],
        ttl: Optional[int] = None,
    ) -> Any:
        """
        Get from cache or fetch and cache if missing.
        
        Args:
            key: Cache key
            fetch_func: Async function to fetch value if not cached
            ttl: Optional TTL override
            
        Returns:
            Cached or fetched value
        """
        # Try cache first
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Fetch if not cached
        logger.debug("cache.fetch", key=key)
        value = await fetch_func()
        await self.set(key, value, ttl=ttl)
        return value
    
    def stats(self) -> Dict[str, int]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with hit/miss/expired counts
        """
        return {
            **self._stats,
            "cached_items": len(self._cache),
        }
    
    def size(self) -> int:
        """Get number of items in cache."""
        return len(self._cache)


# Global cache instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get or create global cache manager."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager(default_ttl=300)  # 5 minutes
    return _cache_manager
