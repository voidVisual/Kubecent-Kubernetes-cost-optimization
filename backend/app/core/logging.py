"""
Structured logging configuration.

Uses structlog for structured JSON logging with context propagation.
"""

import logging
import structlog
import sys
from typing import Any, Dict
from app.core.config import settings


def setup_logging() -> None:
    """Configure structlog with JSON output."""
    
    timestamper = structlog.processors.TimeStamper(fmt="iso")
    
    # Convert string log level to integer
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    shared_processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.CallsiteParameterAdder(
            parameters=[
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.LINENO,
                structlog.processors.CallsiteParameter.FUNC_NAME,
            ]
        ),
    ]
    
    structlog.configure(
        processors=shared_processors
        + [
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        BoundLogger: Configured logger instance
    """
    return structlog.get_logger(name)
