/**
 * API client for Kubecent backend.
 * 
 * Handles all HTTP communication with the backend API.
 */

import axios, { AxiosInstance } from 'axios'
import { ClusterCost, NamespaceCost, PodCost, OptimizationReport } from '../types'

class APIClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(baseURL: string = '/') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
    })

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error)
        throw error
      }
    )
  }

  /**
   * Set authentication token.
   * 
   * @param token Kubernetes service account token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * Get cluster-wide cost allocation.
   */
  async getClusterCost(
    startTime?: string,
    endTime?: string,
    forceRefresh: boolean = false
  ): Promise<ClusterCost> {
    const { data } = await this.client.get('/costs/cluster', {
      params: {
        start_time: startTime,
        end_time: endTime,
        force_refresh: forceRefresh,
      },
    })
    return data
  }

  /**
   * Get costs aggregated by namespace.
   */
  async getNamespaceCosts(
    startTime?: string,
    endTime?: string,
    limit: number = 100
  ): Promise<NamespaceCost[]> {
    const { data } = await this.client.get('/costs/namespaces', {
      params: {
        start_time: startTime,
        end_time: endTime,
        limit,
      },
    })
    return data
  }

  /**
   * Get costs per pod.
   */
  async getPodCosts(
    namespace?: string,
    startTime?: string,
    endTime?: string,
    limit: number = 50
  ): Promise<PodCost[]> {
    const { data } = await this.client.get('/costs/pods', {
      params: {
        namespace,
        start_time: startTime,
        end_time: endTime,
        limit,
      },
    })
    return data
  }

  /**
   * Get optimization recommendations.
   */
  async getOptimizationReport(
    startTime?: string,
    endTime?: string
  ): Promise<OptimizationReport> {
    const { data } = await this.client.get('/optimizations/report', {
      params: {
        start_time: startTime,
        end_time: endTime,
      },
    })
    return data
  }

  /**
   * Generic GET request.
   */
  async get<T = any>(url: string, config?: any): Promise<{ data: T }> {
    return await this.client.get(url, config)
  }

  /**
   * Generic POST request.
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    return await this.client.post(url, data, config)
  }

  /**
   * Generic PUT request.
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    return await this.client.put(url, data, config)
  }

  /**
   * Generic DELETE request.
   */
  async delete<T = any>(url: string, config?: any): Promise<{ data: T }> {
    return await this.client.delete(url, config)
  }
}

export const apiClient = new APIClient()
