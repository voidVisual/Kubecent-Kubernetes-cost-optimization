"""
Pydantic models for API requests and responses.

Uses Pydantic V2 for validation and serialization.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============= Cost Models =============

class CostAllocation(BaseModel):
    """Cost allocation for a resource."""
    
    cpu_cost: float = Field(..., ge=0, description="CPU cost")
    memory_cost: float = Field(..., ge=0, description="Memory cost")
    storage_cost: float = Field(..., ge=0, description="Storage cost")
    network_cost: float = Field(..., ge=0, description="Network cost")
    total_cost: float = Field(..., ge=0, description="Total cost")


class PodCost(BaseModel):
    """Cost information for a Pod."""
    
    name: str = Field(..., description="Pod name")
    namespace: str = Field(..., description="Pod namespace")
    pod_allocation: CostAllocation = Field(..., description="Pod cost allocation")
    
    class Config:
        from_attributes = True


class ContainerCost(BaseModel):
    """Cost information for a Container."""
    
    name: str = Field(..., description="Container name")
    pod_name: str = Field(..., description="Parent pod name")
    namespace: str = Field(..., description="Namespace")
    container_allocation: CostAllocation = Field(..., description="Container cost allocation")
    
    class Config:
        from_attributes = True


class NamespaceCost(BaseModel):
    """Aggregated cost for a namespace."""
    
    namespace: str = Field(..., description="Namespace name")
    pod_count: int = Field(..., ge=0, description="Number of pods")
    allocation: CostAllocation = Field(..., description="Total cost allocation")
    
    class Config:
        from_attributes = True


class ClusterCost(BaseModel):
    """Overall cluster cost information."""
    
    cluster_name: str = Field(..., description="Cluster name")
    namespaces: int = Field(..., ge=0, description="Number of namespaces")
    pods: int = Field(..., ge=0, description="Total pod count")
    allocation: CostAllocation = Field(..., description="Cluster-wide cost allocation")
    timestamp: datetime = Field(..., description="Data collection timestamp")
    
    class Config:
        from_attributes = True


# ============= Optimization Recommendations =============

class OptimizationSuggestion(BaseModel):
    """A single optimization suggestion."""
    
    title: str = Field(..., description="Suggestion title")
    description: str = Field(..., description="Detailed description")
    category: str = Field(..., description="Category (e.g., 'rightsizing', 'idle')")
    estimated_savings: float = Field(..., ge=0, description="Estimated monthly savings in USD")
    priority: str = Field(..., description="Priority level (low, medium, high, critical)")
    affected_resources: List[str] = Field(..., description="Affected pod/namespace names")


class OptimizationReport(BaseModel):
    """Optimization recommendations report."""
    
    cluster_name: str = Field(..., description="Cluster name")
    total_suggestions: int = Field(..., ge=0, description="Total number of suggestions")
    estimated_total_savings: float = Field(..., ge=0, description="Total estimated savings")
    suggestions: List[OptimizationSuggestion] = Field(..., description="List of suggestions")
    generated_at: datetime = Field(..., description="Report generation timestamp")


# ============= Health & Status Models =============

class HealthCheck(BaseModel):
    """Application health status."""
    
    status: str = Field(..., description="Overall status (healthy, degraded, unhealthy)")
    version: str = Field(..., description="Application version")
    checks: Dict[str, str] = Field(..., description="Individual service health checks")
    timestamp: datetime = Field(..., description="Check timestamp")


# ============= Time Series Models =============

class TimeSeriesDataPoint(BaseModel):
    """Single data point in a time series."""
    
    timestamp: datetime = Field(..., description="Data point timestamp")
    value: float = Field(..., description="Metric value")


class TimeSeriesData(BaseModel):
    """Time series data for cost trends."""
    
    metric_name: str = Field(..., description="Metric name")
    resource: str = Field(..., description="Resource name")
    data_points: List[TimeSeriesDataPoint] = Field(..., description="Data points")


class CostTrend(BaseModel):
    """Cost trend over time."""
    
    period: str = Field(..., description="Period (daily, weekly, monthly)")
    data: List[TimeSeriesData] = Field(..., description="Time series data")


# ============= Filter & Query Models =============

class CostFilter(BaseModel):
    """Filters for cost queries."""
    
    namespaces: Optional[List[str]] = Field(None, description="Filter by namespaces")
    pods: Optional[List[str]] = Field(None, description="Filter by pod names")
    start_time: Optional[datetime] = Field(None, description="Start time for data range")
    end_time: Optional[datetime] = Field(None, description="End time for data range")
    group_by: str = Field("namespace", description="Group results by")


# ============= Error Models =============

class ErrorDetail(BaseModel):
    """Error response detail."""
    
    detail: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(..., description="Error timestamp")


class ValidationError(BaseModel):
    """Validation error response."""
    
    detail: List[Dict[str, Any]] = Field(..., description="Validation errors")

# ============= Metrics Models =============

class PodMetrics(BaseModel):
    """Pod resource metrics."""
    
    pod: str = Field(..., description="Pod name")
    namespace: str = Field(..., description="Namespace")
    cpu_usage: float = Field(..., ge=0, description="Current CPU usage (cores)")
    cpu_requested: float = Field(..., ge=0, description="Requested CPU (cores)")
    memory_usage: float = Field(..., ge=0, description="Current memory usage (MB)")
    memory_requested: float = Field(..., ge=0, description="Requested memory (MB)")
    network_in: float = Field(..., ge=0, description="Network inbound (bytes/sec)")
    network_out: float = Field(..., ge=0, description="Network outbound (bytes/sec)")
    timestamp: datetime = Field(..., description="Metrics timestamp")


class NodeMetrics(BaseModel):
    """Node resource metrics."""
    
    node: str = Field(..., description="Node name")
    cpu_capacity: float = Field(..., ge=0, description="Total CPU capacity (cores)")
    cpu_allocatable: float = Field(..., ge=0, description="Allocatable CPU (cores)")
    cpu_used: float = Field(..., ge=0, description="Currently used CPU (cores)")
    memory_capacity: float = Field(..., ge=0, description="Total memory (GB)")
    memory_allocatable: float = Field(..., ge=0, description="Allocatable memory (GB)")
    memory_used: float = Field(..., ge=0, description="Currently used memory (GB)")
    pod_count: int = Field(..., ge=0, description="Number of pods")
    status: str = Field(..., description="Node status (Ready, NotReady, etc)")
    timestamp: datetime = Field(..., description="Metrics timestamp")


class ResourceEfficiency(BaseModel):
    """Resource efficiency analysis."""
    
    cpu_efficiency: float = Field(..., ge=0, le=1, description="CPU utilization ratio")
    memory_efficiency: float = Field(..., ge=0, le=1, description="Memory utilization ratio")
    network_efficiency: float = Field(..., ge=0, le=1, description="Network utilization ratio")
    over_provisioned: List[Dict[str, Any]] = Field(..., description="Over-provisioned resources")
    under_provisioned: List[Dict[str, Any]] = Field(..., description="Under-provisioned resources")


class BudgetAlert(BaseModel):
    """Budget alert notification."""
    
    alert_id: str = Field(..., description="Alert ID")
    namespace: str = Field(..., description="Namespace")
    budget_limit: float = Field(..., ge=0, description="Budget limit (USD)")
    current_spend: float = Field(..., ge=0, description="Current month spend")
    percentage: float = Field(..., description="Percentage of budget used")
    severity: str = Field(..., description="Alert severity (info, warning, critical)")
    message: str = Field(..., description="Alert message")
    created_at: datetime = Field(..., description="Alert creation time")