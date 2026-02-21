# Backend tests
from app.services.cost_service import CostService, CostAllocation, NamespaceCost
import pytest


def test_cost_allocation_creation():
    """Test CostAllocation model creation."""
    allocation = CostAllocation(
        cpu_cost=10.0,
        memory_cost=5.0,
        storage_cost=2.0,
        network_cost=1.0,
        total_cost=18.0,
    )
    assert allocation.total_cost == 18.0
    assert allocation.cpu_cost == 10.0


def test_namespace_cost_creation():
    """Test NamespaceCost model creation."""
    allocation = CostAllocation(
        cpu_cost=10.0,
        memory_cost=5.0,
        storage_cost=2.0,
        network_cost=1.0,
        total_cost=18.0,
    )
    ns_cost = NamespaceCost(
        namespace="default",
        pod_count=5,
        allocation=allocation,
    )
    assert ns_cost.namespace == "default"
    assert ns_cost.pod_count == 5
