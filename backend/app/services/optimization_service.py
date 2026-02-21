"""
Optimization recommendations service.

Analyzes cost data and generates actionable recommendations.
"""

import structlog
from typing import List
from datetime import datetime

from app.models.schemas import (
    OptimizationSuggestion,
    OptimizationReport,
    NamespaceCost,
    PodCost,
    CostAllocation,
)
from app.services.cost_service import CostService

logger = structlog.get_logger(__name__)


class OptimizationService:
    """
    Service for generating optimization recommendations.
    
    Analyzes cost data and identifies:
    - Underutilized resources (idle pods)
    - Oversized resource requests
    - Unscheduled pods
    """
    
    # Thresholds for optimization rules
    IDLE_POD_THRESHOLD = 0.01  # Cost < 1 cent/day
    HIGH_PRIORITY_THRESHOLD = 1000  # Monthly cost
    
    def __init__(self, cost_service: CostService):
        """
        Initialize optimization service.
        
        Args:
            cost_service: CostService instance
        """
        self.cost_service = cost_service
    
    def analyze_idle_pods(
        self,
        pod_costs: List[PodCost],
    ) -> List[OptimizationSuggestion]:
        """
        Identify potentially idle or unused pods.
        
        Args:
            pod_costs: List of pod costs
            
        Returns:
            List of optimization suggestions
        """
        suggestions = []
        
        for pod in pod_costs:
            # Example heuristic: very low cost pods
            if pod.pod_allocation.total_cost < self.IDLE_POD_THRESHOLD:
                suggestions.append(
                    OptimizationSuggestion(
                        title=f"Idle pod detected: {pod.name}",
                        description=f"Pod {pod.name} in {pod.namespace} has minimal resource usage. Consider removing or consolidating.",
                        category="idle",
                        estimated_savings=pod.pod_allocation.total_cost * 30,  # Monthly estimate
                        priority="low",
                        affected_resources=[pod.name],
                    )
                )
        
        return suggestions
    
    def analyze_namespace_distribution(
        self,
        namespace_costs: List[NamespaceCost],
    ) -> List[OptimizationSuggestion]:
        """
        Analyze cost distribution across namespaces.
        
        Args:
            namespace_costs: List of namespace costs
            
        Returns:
            List of optimization suggestions
        """
        suggestions = []
        
        # Find high-cost namespaces for review
        high_cost_namespaces = [
            ns for ns in namespace_costs
            if ns.allocation.total_cost > self.HIGH_PRIORITY_THRESHOLD
        ]
        
        for namespace in high_cost_namespaces:
            suggestions.append(
                OptimizationSuggestion(
                    title=f"Review namespace resource allocation: {namespace.namespace}",
                    description=f"Namespace {namespace.namespace} has high cost ({namespace.allocation.total_cost:.2f}). Review pod requests and limits.",
                    category="rightsizing",
                    estimated_savings=namespace.allocation.total_cost * 0.1,  # Conservative 10% savings estimate
                    priority="medium",
                    affected_resources=[namespace.namespace],
                )
            )
        
        return suggestions
    
    def generate_report(
        self,
        start_time: str = None,
        end_time: str = None,
    ) -> OptimizationReport:
        """
        Generate comprehensive optimization report.
        
        Args:
            start_time: ISO format start time
            end_time: ISO format end time
            
        Returns:
            OptimizationReport with recommendations
        """
        try:
            logger.info("optimization.report_generation_started")
            
            # Fetch cost data
            namespace_costs = self.cost_service.get_namespace_costs(
                start_time=start_time,
                end_time=end_time,
            )
            
            pod_costs = self.cost_service.get_pod_costs(
                start_time=start_time,
                end_time=end_time,
                limit=1000,
            )
            
            # Analyze patterns
            idle_suggestions = self.analyze_idle_pods(pod_costs)
            distribution_suggestions = self.analyze_namespace_distribution(namespace_costs)
            
            all_suggestions = idle_suggestions + distribution_suggestions
            total_savings = sum(s.estimated_savings for s in all_suggestions)
            
            report = OptimizationReport(
                cluster_name="default",
                total_suggestions=len(all_suggestions),
                estimated_total_savings=total_savings,
                suggestions=all_suggestions,
                generated_at=datetime.now(),
            )
            
            logger.info(
                "optimization.report_generated",
                suggestions=len(all_suggestions),
                estimated_savings=total_savings,
            )
            
            return report
            
        except Exception as e:
            logger.error("optimization.report_error", error=str(e))
            raise
