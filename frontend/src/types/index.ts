/**
 * Type definitions for Kubecent API responses.
 */

export interface CostAllocation {
  cpu_cost: number
  memory_cost: number
  storage_cost: number
  network_cost: number
  total_cost: number
}

export interface ClusterCost {
  cluster_name: string
  namespaces: number
  pods: number
  allocation: CostAllocation
  timestamp: string
}

export interface NamespaceCost {
  namespace: string
  pod_count: number
  allocation: CostAllocation
}

export interface PodCost {
  name: string
  namespace: string
  pod_allocation: CostAllocation
}

export interface OptimizationSuggestion {
  title: string
  description: string
  category: string
  estimated_savings: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  affected_resources: string[]
}

export interface OptimizationReport {
  cluster_name: string
  total_suggestions: number
  estimated_total_savings: number
  suggestions: OptimizationSuggestion[]
  generated_at: string
}
