"""
Request/response logging middleware.

Captures request details, response status, and timing information.
"""

import time
import structlog
from fastapi import Request

logger = structlog.get_logger(__name__)


class LoggingMiddleware:
    """
    Middleware for structured request/response logging.
    
    Logs:
    - Request method and path
    - Response status code
    - Request/response time
    - User information (if available)
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                elapsed = time.time() - start_time
                
                logger.info(
                    "http.request",
                    method=request.method,
                    path=request.url.path,
                    status=status_code,
                    duration_ms=round(elapsed * 1000, 2),
                    user=getattr(request.state, "user", None),
                )
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
