/**
 * Custom React hooks for Kubecent API endpoints
 * Each hook provides data fetching, loading states, error handling, and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { kubecentApi } from '../api/kubecentApi';
import type {
  AllocationsResponse,
  AssetsResponse,
  IdleCostResponse,
  SavingsResponse,
  EfficiencyResponse,
  HistoryResponse,
  TimeRange,
  ApiError,
  ApiState,
} from '../types/api';

interface UseApiOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

/**
 * Generic hook for API calls with loading, error, and auto-refresh
 */
function useApiCall<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
): ApiState<T> & { refetch: () => Promise<void> } {
  const { autoRefresh = false, refreshInterval = 60000, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err as ApiError);
      console.error('API call failed:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, enabled]);

  useEffect(() => {
    fetchData();

    // Setup auto-refresh if enabled
    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook for fetching cost allocations (namespace/pod/deployment costs)
 */
export function useAllocations(options: UseApiOptions = {}) {
  return useApiCall<AllocationsResponse>(
    () => kubecentApi.getAllocations(),
    { autoRefresh: true, refreshInterval: 60000, ...options }
  );
}

/**
 * Hook for fetching asset costs (nodes, disks, etc.)
 */
export function useAssets(options: UseApiOptions = {}) {
  return useApiCall<AssetsResponse>(
    () => kubecentApi.getAssets(),
    { autoRefresh: true, refreshInterval: 60000, ...options }
  );
}

/**
 * Hook for fetching idle resource costs
 */
export function useIdleCost(options: UseApiOptions = {}) {
  return useApiCall<IdleCostResponse>(
    () => kubecentApi.getIdleCost(),
    { autoRefresh: true, refreshInterval: 60000, ...options }
  );
}

/**
 * Hook for fetching savings recommendations
 */
export function useSavings(options: UseApiOptions = {}) {
  return useApiCall<SavingsResponse>(
    () => kubecentApi.getSavings(),
    { autoRefresh: true, refreshInterval: 60000, ...options }
  );
}

/**
 * Hook for fetching efficiency scores
 */
export function useEfficiency(options: UseApiOptions = {}) {
  return useApiCall<EfficiencyResponse>(
    () => kubecentApi.getEfficiency(),
    { autoRefresh: true, refreshInterval: 60000, ...options }
  );
}

/**
 * Hook for fetching historical cost data
 * @param range - Time range (1d, 7d, 30d)
 */
export function useHistory(range: TimeRange = '7d', options: UseApiOptions = {}) {
  const [currentRange, setCurrentRange] = useState<TimeRange>(range);

  const apiState = useApiCall<HistoryResponse>(
    () => kubecentApi.getHistory(currentRange),
    { autoRefresh: false, ...options }
  );

  const setRange = useCallback((newRange: TimeRange) => {
    setCurrentRange(newRange);
  }, []);

  // Refetch when range changes
  useEffect(() => {
    apiState.refetch();
  }, [currentRange]);

  return {
    ...apiState,
    range: currentRange,
    setRange,
  };
}

/**
 * Hook for checking backend health
 */
export function useHealth(options: UseApiOptions = {}) {
  return useApiCall(
    () => kubecentApi.getHealth(),
    { autoRefresh: true, refreshInterval: 30000, ...options }
  );
}

/**
 * Hook for managing dashboard refresh
 * Returns a callback to manually trigger refresh of all data
 */
export function useDashboardRefresh() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(() => {
    setLastRefresh(new Date());
  }, []);

  return {
    lastRefresh,
    refresh,
  };
}
