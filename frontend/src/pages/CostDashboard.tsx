/**
 * Main Cost Optimization Dashboard
 * Integrates all Kubecent features in Kubecost-like layout
 */

import React, { useState } from 'react';
import {
  useAllocations,
  useAssets,
  useIdleCost,
  useSavings,
  useEfficiency,
  useHistory,
} from '../hooks/useKubecentApi';
import { TotalCostCard } from '../components/TotalCostCard';
import { NamespaceTable } from '../components/NamespaceTable';
import { NodeCostBreakdown } from '../components/NodeCostBreakdown';
import { IdleCostCard } from '../components/IdleCostCard';
import { EfficiencyCard } from '../components/EfficiencyCard';
import { SavingsTable } from '../components/SavingsTable';
import { HistoricalChart } from '../components/HistoricalChart';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { RefreshButton } from '../components/RefreshButton';
import type { TimeRange } from '../types/api';
import { DollarSign, TrendingDown, Activity, RefreshCw } from 'lucide-react';

export function CostDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch all data with auto-refresh enabled
  const allocations = useAllocations();
  const assets = useAssets();
  const idleCost = useIdleCost();
  const savings = useSavings();
  const efficiency = useEfficiency();
  const history = useHistory(timeRange);

  // Manual refresh handler
  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await Promise.all([
      allocations.refetch(),
      assets.refetch(),
      idleCost.refetch(),
      savings.refetch(),
      efficiency.refetch(),
      history.refetch(),
    ]);
  };

  // Check if any critical data is still loading initially
  const isInitialLoading = 
    (allocations.loading && !allocations.data) ||
    (assets.loading && !assets.data);

  // Check for critical errors
  const hasCriticalError = allocations.error || assets.error;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Cost Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time Kubernetes cost optimization and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector
              value={timeRange}
              onChange={(range) => {
                setTimeRange(range);
                history.setRange(range);
              }}
            />
            <RefreshButton onClick={handleRefresh} lastRefresh={lastRefresh} />
          </div>
        </div>
      </div>

      {/* Critical Error Alert */}
      {hasCriticalError && (
        <div className="px-6 py-4">
          <ErrorAlert
            error={allocations.error || assets.error}
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Top Row - Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TotalCostCard
            allocations={allocations.data}
            assets={assets.data}
            loading={allocations.loading || assets.loading}
          />
          
          <IdleCostCard
            data={idleCost.data}
            loading={idleCost.loading}
            error={idleCost.error}
          />
          
          <EfficiencyCard
            data={efficiency.data}
            loading={efficiency.loading}
            error={efficiency.error}
          />
          
          {savings.data && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">Potential Savings</h3>
                <TrendingDown className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${savings.data.totalPotentialSavings.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {savings.data.summary.totalRecommendations} recommendations
              </p>
            </div>
          )}
        </div>

        {/* Historical Cost Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Cost Trend
            </h2>
            {history.loading && (
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            )}
          </div>
          <HistoricalChart
            data={history.data}
            loading={history.loading}
            error={history.error}
            range={timeRange}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Namespace Cost Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Namespace Costs
            </h2>
            <NamespaceTable
              data={allocations.data}
              loading={allocations.loading}
              error={allocations.error}
            />
          </div>

          {/* Node Cost Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Node Costs
            </h2>
            <NodeCostBreakdown
              data={assets.data}
              loading={assets.loading}
              error={assets.error}
            />
          </div>
        </div>

        {/* Savings Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cost Optimization Recommendations
          </h2>
          <SavingsTable
            data={savings.data}
            loading={savings.loading}
            error={savings.error}
          />
        </div>
      </div>
    </div>
  );
}
