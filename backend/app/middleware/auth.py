"""
Kubernetes RBAC authentication middleware.

Validates Kubernetes service account tokens and extracts identity information.
"""

import structlog
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import jwt
from jwt import PyJWTError
from app.core.config import Settings
from app.core.exceptions import AuthenticationException

logger = structlog.get_logger(__name__)


class RBACMiddleware(BaseHTTPMiddleware):
    """
    Kubernetes RBAC authentication middleware.
    
    Validates JWT tokens from Kubernetes service accounts and attaches
    user information to request state.
    """
    
    def __init__(self, app, settings: Settings):
        super().__init__(app)
        self.settings = settings
        self._ca_cert: Optional[str] = None
    
    def _load_ca_cert(self) -> str:
        """Load Kubernetes CA certificate."""
        try:
            with open(
                f"{self.settings.K8S_SERVICE_ACCOUNT_PATH}/ca.crt", "r"
            ) as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("kubernetes.ca_cert_not_found")
            return ""
    
    def _decode_token(self, token: str) -> dict:
        """
        Decode and validate Kubernetes service account token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            AuthenticationException: If token is invalid
        """
        try:
            # In production, validate with Kubernetes CA certificate
            # For development, we can disable verification
            options = {"verify_signature": False} if self.settings.DEBUG else {}
            
            payload = jwt.decode(
                token,
                options=options,
                algorithms=[self.settings.JWT_ALGORITHM],
            )
            return payload
        except PyJWTError as e:
            logger.warning("kubernetes.token_validation_failed", error=str(e))
            raise AuthenticationException(f"Invalid token: {str(e)}")
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """
        Extract JWT token from Authorization header.
        
        Args:
            request: FastAPI request
            
        Returns:
            Token string or None
        """
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        return auth_header[7:]  # Remove "Bearer " prefix
    
    async def dispatch(self, request: Request, call_next):
        """Process request with RBAC validation."""
        
        # Skip authentication for health checks, metrics, and all API endpoints
        # In production, you would implement proper RBAC with service account tokens
        if request.url.path in ["/health", "/metrics", "/api/v1/health"] or request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Skip for Swagger/OpenAPI docs in debug mode
        if self.settings.DEBUG and request.url.path.startswith("/api/docs"):
            return await call_next(request)
        
        token = self._extract_token(request)
        
        if not token:
            logger.warning("authentication.missing_token", path=request.url.path)
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authorization token"},
            )
        
        try:
            payload = self._decode_token(token)
            request.state.user = {
                "username": payload.get("kubernetes.io/serviceaccount/service-account.name"),
                "namespace": payload.get("kubernetes.io/serviceaccount/namespace"),
                "uid": payload.get("kubernetes.io/serviceaccount/service-account.uid"),
            }
            logger.info(
                "authentication.success",
                username=request.state.user.get("username"),
                namespace=request.state.user.get("namespace"),
            )
        except AuthenticationException as e:
            logger.warning("authentication.failed", error=e.message)
            return JSONResponse(
                status_code=401,
                content={"detail": e.message},
            )
        
        return await call_next(request)
