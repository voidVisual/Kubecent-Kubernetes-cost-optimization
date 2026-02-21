/**
 * Custom hooks for Kubecent frontend.
 */

import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'
import { ClusterCost, NamespaceCost, OptimizationReport } from '../types'

/**
 * Generic API hook for fetching data from any endpoint
 */
export function useApi<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Use apiClient instead of hardcoded axios call
        const response = await apiClient.get(endpoint)
        setData(response.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [endpoint])

  return { data, loading, error }
}

export function useClusterCost() {
  const [data, setData] = useState<ClusterCost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await apiClient.getClusterCost()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  return { data, loading, error, refetch: () => apiClient.getClusterCost().then(setData) }
}

export function useNamespaceCosts() {
  const [data, setData] = useState<NamespaceCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await apiClient.getNamespaceCosts()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)

    return () => clearInterval(interval)
  }, [])

  return { data, loading, error }
}

export function useOptimizationReport() {
  const [data, setData] = useState<OptimizationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await apiClient.getOptimizationReport()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
