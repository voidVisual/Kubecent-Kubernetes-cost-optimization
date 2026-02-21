/**
 * TypeScript interfaces for Kubecent API responses
 */

// Time range types
export type TimeRange = '1d' | '7d' | '30d';

// Common types
export interface CostBreakdown {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  total: number;
}

// Health endpoint
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
}

// Allocations endpoint - namespace/pod/deployment costs
export interface AllocationItem {
  name: string;
  namespace: string;
  type: 'pod' | 'deployment' | 'statefulset' | 'daemonset';
  costs: CostBreakdown;
  efficiency: number;
  cpuRequested: string;
  cpuUsed: string;
  memoryRequested: string;
  memoryUsed: string;
}

export interface AllocationsResponse {
  totalCost: number;
  currency: string;
  window: string;
  allocations: AllocationItem[];
}

// Assets endpoint - node/cluster costs
export interface AssetItem {
  name: string;
  type: 'node' | 'disk' | 'network' | 'loadbalancer';
  costs: CostBreakdown;
  providerID: string;
  region?: string;
  instanceType?: string;
  hourlyRate?: number;
}

export interface AssetsResponse {
  totalCost: number;
  currency: string;
  window: string;
  assets: AssetItem[];
}

// Idle cost endpoint
export interface IdleResource {
  namespace: string;
  resourceType: 'cpu' | 'memory' | 'storage';
  allocated: number;
  used: number;
  idle: number;
  idleCost: number;
  unit: string;
}

export interface IdleCostResponse {
  totalIdleCost: number;
  idlePercentage: number;
  currency: string;
  resources: IdleResource[];
}

// Savings/recommendations endpoint
export interface Recommendation {
  id: string;
  type: 'rightsizing' | 'termination' | 'scheduling' | 'storage';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  resourceName: string;
  namespace: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercentage: number;
  action: string;
  implementation: string;
}

export interface SavingsResponse {
  totalPotentialSavings: number;
  currency: string;
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

// Efficiency endpoint
export interface EfficiencyMetric {
  metric: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  details: string;
}

export interface EfficiencyResponse {
  overallScore: number;
  cpuEfficiency: number;
  memoryEfficiency: number;
  storageEfficiency: number;
  costEfficiency: number;
  metrics: EfficiencyMetric[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// History endpoint
export interface HistoryDataPoint {
  timestamp: string;
  cost: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  networkCost: number;
}

export interface HistoryResponse {
  window: string;
  currency: string;
  data: HistoryDataPoint[];
  aggregation: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
}

// Namespace cost summary
export interface NamespaceCost {
  namespace: string;
  cost: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  pods: number;
  efficiency: number;
}

// API Error response
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// Loading state wrapper
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}
