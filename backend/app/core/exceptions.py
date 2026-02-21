"""
Custom application exceptions.

Provides domain-specific exceptions for clearer error handling.
"""

from typing import Any, Optional


class KubcentException(Exception):
    """Base exception for all Kubecent errors."""
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Any] = None,
    ) -> None:
        self.message = message
        self.code = code or self.__class__.__name__
        self.details = details
        super().__init__(message)


class OpenCostException(KubcentException):
    """Raised when OpenCost API call fails."""
    
    pass


class AuthenticationException(KubcentException):
    """Raised when authentication fails."""
    
    pass


class AuthorizationException(KubcentException):
    """Raised when user lacks required permissions."""
    
    pass


class ValidationException(KubcentException):
    """Raised when input validation fails."""
    
    pass


class ConfigurationException(KubcentException):
    """Raised when configuration is invalid."""
    
    pass


class NotFoundException(KubcentException):
    """Raised when requested resource is not found."""
    
    pass
