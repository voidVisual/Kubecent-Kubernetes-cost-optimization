import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { useAllocations, useAssets, useIdleCost, useEfficiency, useSavings } from '../hooks/useKubecentApi';

export function Dashboard() {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('7d');
  
  // Fetch data using custom hooks
  const { data: allocations, loading: allocationsLoading, error: allocationsError, refetch: refetchAllocations } = useAllocations();
  const { data: assets, loading: assetsLoading } = useAssets();
  const { data: idleCost, loading: idleLoading } = useIdleCost();
  const { data: efficiency, loading: efficiencyLoading } = useEfficiency();
  const { data: savings, loading: savingsLoading } = useSavings();

  // Loading state
  const isLoading = allocationsLoading || assetsLoading || idleLoading || efficiencyLoading || savingsLoading;

  // Calculate metrics
  const totalCost = allocations?.totalCost || 0;
  const totalIdleCost = idleCost?.totalIdleCost || 0;
  const idlePercentage = idleCost?.idlePercentage || 0;
  const efficiencyScore = efficiency?.overallScore || 0;
  const potentialSavings = savings?.totalPotentialSavings || 0;
  const cpuEfficiency = efficiency?.cpuEfficiency || 0;
  const memoryEfficiency = efficiency?.memoryEfficiency || 0;

  // Top 5 namespaces by cost
  const topNamespaces = allocations?.allocations
    ?.sort((a, b) => b.costs.total - a.costs.total)
    .slice(0, 5) || [];

  // Asset breakdown
  const assetBreakdown = assets?.assets
    ?.reduce((acc, asset) => {
      const existing = acc.find(a => a.type === asset.type);
      if (existing) {
        existing.cost += asset.costs.total;
      } else {
        acc.push({ type: asset.type, cost: asset.costs.total });
      }
      return acc;
    }, [] as { type: string; cost: number }[]) || [];

  // Refresh handler
  const handleRefresh = () => {
    refetchAllocations();
  };

  if (allocationsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Error loading dashboard data</p>
          <p className="text-gray-500 text-sm mt-2">{allocationsError.message}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Overview</h1>
          <p className="text-gray-500 text-sm">Last {timeRange === '1d' ? '24 Hours' : timeRange === '7d' ? '7 Days' : '30 Days'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setTimeRange('1d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '1d'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              1D
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '7d'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '30d'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              30D
            </button>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Total Kubernetes Costs</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {isLoading ? '...' : `$${totalCost.toFixed(2)}`}
          </p>
          <p className="text-xs text-gray-500 mt-2">{allocations?.currency || 'USD'}</p>
        </div>

        {/* Idle Cost Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Idle Costs</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {isLoading ? '...' : `$${totalIdleCost.toFixed(2)}`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium">
              {idlePercentage.toFixed(1)}% idle
            </span>
          </div>
        </div>

        {/* Efficiency Score Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Efficiency Score</h3>
            <Zap className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {isLoading ? '...' : `${efficiencyScore.toFixed(1)}%`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              efficiencyScore >= 70 
                ? 'bg-emerald-100 text-emerald-700' 
                : efficiencyScore >= 50 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              Grade: {efficiency?.grade || 'N/A'}
            </span>
          </div>
        </div>

        {/* Potential Savings Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Potential Savings</h3>
            <TrendingDown className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {isLoading ? '...' : `$${potentialSavings.toFixed(2)}`}
          </p>
          <button className="text-emerald-600 text-xs font-medium mt-2 hover:text-emerald-700">
            View {savings?.recommendations.length || 0} recommendations →
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Namespaces by Cost */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Namespaces by Cost</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : topNamespaces.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                      NAMESPACE
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                      TYPE
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                      COST
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                      EFFICIENCY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topNamespaces.map((ns, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{ns.namespace}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs uppercase">{ns.type}</td>
                      <td className="py-3 px-4 text-gray-900 text-right font-medium">
                        ${ns.costs.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          ns.efficiency >= 70 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : ns.efficiency >= 50 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {ns.efficiency.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No namespace data available
            </div>
          )}
        </div>

        {/* Resource Efficiency */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resource Efficiency</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: 'CPU', efficiency: cpuEfficiency },
                { name: 'Memory', efficiency: memoryEfficiency },
                { name: 'Storage', efficiency: efficiency?.storageEfficiency || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => `${value.toFixed(1)}%`}
                />
                <Bar dataKey="efficiency" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Asset Cost Breakdown</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : assetBreakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assetBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
                formatter={(value: any) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="cost" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No asset data available
          </div>
        )}
      </div>
    </div>
  );
}
