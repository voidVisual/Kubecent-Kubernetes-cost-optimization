import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingDown, Filter, Download } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface CostAllocationRow {
  namespace: string;
  pod_count: number;
  cpu_cost: number;
  memory_cost: number;
  storage_cost: number;
  network_cost: number;
  total_cost: number;
  trend: number;
}

export function CostAllocation() {
  const [groupBy, setGroupBy] = useState<'namespace' | 'pod' | 'controller'>('namespace');
  const { data: namespaces, loading } = useApi('/api/v1/cost/namespaces');

  const allocationData: CostAllocationRow[] =
    namespaces?.map((ns: any) => ({
      namespace: ns.namespace,
      pod_count: ns.pod_count,
      cpu_cost: ns.allocation?.cpu_cost || 0,
      memory_cost: ns.allocation?.memory_cost || 0,
      storage_cost: ns.allocation?.storage_cost || 0,
      network_cost: ns.allocation?.network_cost || 0,
      total_cost: ns.allocation?.total_cost || 0,
      trend: Math.random() * 20 - 10,
    })) || [];

  const chartData = allocationData.map((item) => ({
    name: item.namespace,
    CPU: item.cpu_cost,
    Memory: item.memory_cost,
    Storage: item.storage_cost,
    Network: item.network_cost,
  }));

  const COLORS = {
    CPU: '#3b82f6',
    Memory: '#8b5cf6',
    Storage: '#ec4899',
    Network: '#f59e0b',
  };

  const totalCost = allocationData.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cost Allocation</h1>
        <p className="text-gray-400">Detailed breakdown of costs by namespace, pod, and resource type</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <button
            onClick={() => setGroupBy('namespace')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              groupBy === 'namespace'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            By Namespace
          </button>
          <button
            onClick={() => setGroupBy('pod')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              groupBy === 'pod'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            By Pod
          </button>
          <button
            onClick={() => setGroupBy('controller')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              groupBy === 'controller'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            By Controller
          </button>
        </div>
        <button className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Namespaces</p>
          <p className="text-2xl font-bold text-white">{allocationData.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Avg Cost/Namespace</p>
          <p className="text-2xl font-bold text-white">${(totalCost / allocationData.length).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Total Pods</p>
          <p className="text-2xl font-bold text-white">
            {allocationData.reduce((sum, item) => sum + item.pod_count, 0)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">Cost by Resource Type</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            {Object.entries(COLORS).map(([type, color]) => (
              <Bar key={type} dataKey={type} stackId="a" fill={color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Namespace</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Pods</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">CPU Cost</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Memory Cost</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Storage Cost</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Network Cost</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Cost</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : (
                allocationData.map((row) => (
                  <tr key={row.namespace} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-sm text-white font-medium">{row.namespace}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{row.pod_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">${row.cpu_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">${row.memory_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">${row.storage_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">${row.network_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-white font-bold text-right">${row.total_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          row.trend < 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4 rotate-180" />
                        {Math.abs(row.trend).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
