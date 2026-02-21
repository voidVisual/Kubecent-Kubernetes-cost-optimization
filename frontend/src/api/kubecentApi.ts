/**
 * Centralized API service layer for Kubecent backend
 * All API calls to FastAPI backend go through this service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  HealthResponse,
  AllocationsResponse,
  AssetsResponse,
  IdleCostResponse,
  SavingsResponse,
  EfficiencyResponse,
  HistoryResponse,
  TimeRange,
  ApiError,
} from '../types/api';

// Get backend URL from environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

class KubecentApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          error: error.name,
          message: error.message,
          statusCode: error.response?.status || 500,
          timestamp: new Date().toISOString(),
        };

        if (error.response?.data) {
          const data = error.response.data as any;
          apiError.message = data.message || data.detail || error.message;
        }

        console.error('[API Error]', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Health check endpoint
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/api/health');
    return response.data;
  }

  /**
   * Get cost allocations by namespace/pod/deployment
   */
  async getAllocations(): Promise<AllocationsResponse> {
    const response = await this.client.get<AllocationsResponse>('/api/allocations');
    return response.data;
  }

  /**
   * Get asset costs (nodes, disks, etc.)
   */
  async getAssets(): Promise<AssetsResponse> {
    const response = await this.client.get<AssetsResponse>('/api/assets');
    return response.data;
  }

  /**
   * Get idle resource costs
   */
  async getIdleCost(): Promise<IdleCostResponse> {
    const response = await this.client.get<IdleCostResponse>('/api/idle');
    return response.data;
  }

  /**
   * Get savings recommendations
   */
  async getSavings(): Promise<SavingsResponse> {
    const response = await this.client.get<SavingsResponse>('/api/savings');
    return response.data;
  }

  /**
   * Get efficiency scores
   */
  async getEfficiency(): Promise<EfficiencyResponse> {
    const response = await this.client.get<EfficiencyResponse>('/api/efficiency');
    return response.data;
  }

  /**
   * Get historical cost data
   * @param range - Time range (1d, 7d, 30d)
   */
  async getHistory(range: TimeRange = '7d'): Promise<HistoryResponse> {
    const response = await this.client.get<HistoryResponse>('/api/history', {
      params: { range },
    });
    return response.data;
  }
}

// Export singleton instance
export const kubecentApi = new KubecentApiService();

// Export class for testing
export default KubecentApiService;
