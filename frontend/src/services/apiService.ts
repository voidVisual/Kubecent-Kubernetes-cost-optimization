/**
 * API Service for Kubecent Cost Dashboard
 * 
 * Provides a comprehensive service layer for all backend API calls.
 * Integrates with both existing endpoints and new cost optimization endpoints.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Backend URL from environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * API Response types for the Cost Dashboard
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
}

export interface AllocationItem {
  name: string;
  namespace: string;
  type: 'pod' | 'deployment' | 'statefulset' | 'daemonset';
  costs: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    total: number;
  };
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

export interface AssetItem {
  name: string;
  type: 'node' | 'disk' | 'network' | 'loadbalancer';
  costs: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    total: number;
  };
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

export type TimeRange = '1d' | '7d' | '30d';

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * API Service Class
 */
class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        
        // Log request
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
        
        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API Response] ${response.config.url}`, response.status);
        return response;
      },
      (error: AxiosError) => {
        const apiError: ApiError = {
          error: error.name || 'API Error',
          message: error.message || 'Unknown error occurred',
          statusCode: error.response?.status || 500,
          timestamp: new Date().toISOString(),
        };

        // Extract error message from response
        if (error.response?.data) {
          const data = error.response.data as any;
          apiError.message = data.message || data.detail || data.error || error.message;
        }

        console.error('[API Error]', {
          url: error.config?.url,
          status: error.response?.status,
          message: apiError.message,
        });

        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Generic request method
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // ============================================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================================

  /**
   * Health check endpoint
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>({
      method: 'GET',
      url: '/api/health',
    });
  }

  // ============================================================
  // COST ALLOCATION ENDPOINTS
  // ============================================================

  /**
   * Get cost allocations by namespace/pod/deployment
   */
  async getAllocations(): Promise<AllocationsResponse> {
    return this.request<AllocationsResponse>({
      method: 'GET',
      url: '/api/allocations',
    });
  }

  /**
   * Get asset costs (nodes, disks, etc.)
   */
  async getAssets(): Promise<AssetsResponse> {
    return this.request<AssetsResponse>({
      method: 'GET',
      url: '/api/assets',
    });
  }

  /**
   * Get idle resource costs
   */
  async getIdleCost(): Promise<IdleCostResponse> {
    return this.request<IdleCostResponse>({
      method: 'GET',
      url: '/api/idle',
    });
  }

  // ============================================================
  // OPTIMIZATION ENDPOINTS
  // ============================================================

  /**
   * Get savings recommendations
   */
  async getSavings(): Promise<SavingsResponse> {
    return this.request<SavingsResponse>({
      method: 'GET',
      url: '/api/savings',
    });
  }

  /**
   * Get efficiency scores
   */
  async getEfficiency(): Promise<EfficiencyResponse> {
    return this.request<EfficiencyResponse>({
      method: 'GET',
      url: '/api/efficiency',
    });
  }

  // ============================================================
  // HISTORICAL DATA ENDPOINTS
  // ============================================================

  /**
   * Get historical cost data
   * @param range - Time range (1d, 7d, 30d)
   */
  async getHistory(range: TimeRange = '7d'): Promise<HistoryResponse> {
    return this.request<HistoryResponse>({
      method: 'GET',
      url: '/api/history',
      params: { range },
    });
  }

  // ============================================================
  // EXISTING V1 API ENDPOINTS (Backward Compatibility)
  // ============================================================

  /**
   * Get cluster-wide cost allocation
   */
  async getClusterCost(params?: {
    startTime?: string;
    endTime?: string;
    forceRefresh?: boolean;
  }): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/cost/cluster',
      params: {
        start_time: params?.startTime,
        end_time: params?.endTime,
        force_refresh: params?.forceRefresh,
      },
    });
  }

  /**
   * Get costs aggregated by namespace
   */
  async getNamespaceCosts(params?: {
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/cost/namespaces',
      params: {
        start_time: params?.startTime,
        end_time: params?.endTime,
        limit: params?.limit || 100,
      },
    });
  }

  /**
   * Get costs per pod
   */
  async getPodCosts(params?: {
    namespace?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/cost/pods',
      params: {
        namespace: params?.namespace,
        start_time: params?.startTime,
        end_time: params?.endTime,
        limit: params?.limit || 50,
      },
    });
  }

  /**
   * Get optimization recommendations (V1 API)
   */
  async getOptimizationReport(params?: {
    startTime?: string;
    endTime?: string;
  }): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/optimizations/report',
      params: {
        start_time: params?.startTime,
        end_time: params?.endTime,
      },
    });
  }

  /**
   * Get metrics trends
   */
  async getMetricsTrends(days: number = 7): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/metrics/trends',
      params: { days },
    });
  }

  /**
   * Get budget alerts
   */
  async getBudgetAlerts(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/metrics/budget-alerts',
    });
  }

  // ============================================================
  // GRAFANA INTEGRATION ENDPOINTS
  // ============================================================

  /**
   * Check Grafana connection status
   */
  async getGrafanaHealth(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/grafana/health',
    });
  }

  /**
   * Get Grafana dashboards
   */
  async getGrafanaDashboards(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/grafana/dashboards',
    });
  }

  /**
   * Get Grafana dashboard links
   */
  async getGrafanaLinks(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/v1/grafana/links',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing
export default ApiService;
