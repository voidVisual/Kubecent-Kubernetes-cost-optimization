"""
Application configuration management.

Uses Pydantic Settings for environment variable parsing and validation.
Supports both file-based and environment variable configuration.
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Application
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    
    # OpenCost Integration
    OPENCOST_URL: str = Field(
        default="http://opencost:9003",
        description="OpenCost API endpoint",
    )
    OPENCOST_TIMEOUT: int = Field(default=30, description="OpenCost request timeout (seconds)")
    
    # Kubernetes
    K8S_NAMESPACE: str = Field(
        default="kubecent",
        description="Kubernetes namespace where Kubecent is deployed",
    )
    K8S_SERVICE_ACCOUNT_PATH: str = Field(
        default="/var/run/secrets/kubernetes.io/serviceaccount",
        description="Path to mounted service account token",
    )
    
    # Prometheus
    PROMETHEUS_URL: str = Field(
        default="http://prometheus:9090",
        description="Prometheus API endpoint",
    )
    PROMETHEUS_TIMEOUT: int = Field(default=30, description="Prometheus request timeout (seconds)")
    
    # Grafana
    GRAFANA_URL: str = Field(
        default="http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local",
        description="Grafana URL for monitoring dashboards",
    )
    GRAFANA_API_KEY: str = Field(
        default="",
        description="Grafana API key (optional)",
    )
    
    # Security
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="CORS allowed origins",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ENABLE_SWAGGER: bool = Field(default=True, description="Enable Swagger UI")
    
    # Cache
    CACHE_TTL: int = Field(default=300, description="Cache TTL in seconds")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    class Config:
        """Pydantic config."""
        env_file = ".env"
        case_sensitive = True


settings = Settings()
