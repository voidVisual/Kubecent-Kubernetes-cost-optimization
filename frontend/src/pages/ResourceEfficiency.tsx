import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { AlertTriangle, TrendingUp, Zap, Database } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface PodData {
  name: string;
  namespace: string;
  cpu_requested: number;
  cpu_usage: number;
  memory_requested: number;
  memory_usage: number;
  efficiency: number;
  savings_potential: number;
}

export function ResourceEfficiency() {
  const { data: pods, loading } = useApi('/api/v1/metrics/pods');
  const { data: efficiency } = useApi('/api/v1/metrics/efficiency');
  const [selectedResource, setSelectedResource] = useState<'cpu' | 'memory'>('cpu');

  const podData: PodData[] =
    pods?.map((pod: any) => ({
      name: pod.pod,
      namespace: pod.namespace,
      cpu_requested: pod.cpu_requested,
      cpu_usage: pod.cpu_usage,
      memory_requested: pod.memory_requested,
      memory_usage: pod.memory_usage,
      efficiency: (pod.cpu_usage / pod.cpu_requested + pod.memory_usage / pod.memory_requested) / 2,
      savings_potential: (pod.cpu_requested - pod.cpu_usage) * 0.05 + (pod.memory_requested - pod.memory_usage) * 0.02,
    })) || [];

  const scatterData = podData.map((pod) => ({
    name: pod.name,
    x: selectedResource === 'cpu' ? pod.cpu_requested : pod.memory_requested,
    y: selectedResource === 'cpu' ? pod.cpu_usage : pod.memory_usage,
  }));

  const barData = [
    {
      name: 'CPU',
      requested: podData.reduce((sum, p) => sum + p.cpu_requested, 0),
      used: podData.reduce((sum, p) => sum + p.cpu_usage, 0),
    },
    {
      name: 'Memory',
      requested: podData.reduce((sum, p) => sum + p.memory_requested, 0),
      used: podData.reduce((sum, p) => sum + p.memory_usage, 0),
    },
  ];

  const overProvisionedPods = podData.filter((p) => p.efficiency < 0.3);
  const totalSavingsPotential = podData.reduce((sum, p) => sum + p.savings_potential, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Resource Efficiency</h1>
        <p className="text-gray-400">Analyze resource utilization and identify optimization opportunities</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">CPU Efficiency</h3>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {efficiency?.cpu_efficiency ? (efficiency.cpu_efficiency * 100).toFixed(0) : '65'}%
          </p>
          <p className="text-xs text-gray-400">Average utilization vs requested</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Memory Efficiency</h3>
            <Database className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {efficiency?.memory_efficiency ? (efficiency.memory_efficiency * 100).toFixed(0) : '72'}%
          </p>
          <p className="text-xs text-gray-400">Average utilization vs requested</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Over-Provisioned</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">{overProvisionedPods.length}</p>
          <p className="text-xs text-gray-400">Pods with low utilization</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Savings Potential</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">${totalSavingsPotential.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Monthly cost savings available</p>
        </div>
      </div>

      {/* Resource Comparison */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">Requested vs Used Resources</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
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
            <Bar dataKey="requested" fill="#8b5cf6" name="Requested" />
            <Bar dataKey="used" fill="#3b82f6" name="Used" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter Plot */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Resource Utilization Pattern</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedResource('cpu')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedResource === 'cpu'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setSelectedResource('memory')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedResource === 'memory'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Memory
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="x"
              stroke="#9ca3af"
              name={selectedResource === 'cpu' ? 'CPU Requested' : 'Memory Requested'}
            />
            <YAxis
              type="number"
              dataKey="y"
              stroke="#9ca3af"
              name={selectedResource === 'cpu' ? 'CPU Used' : 'Memory Used'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Scatter name="Pods" data={scatterData} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Over-Provisioned Pods */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Over-Provisioned Pods</h2>
          <p className="text-sm text-gray-400 mt-1">Pods using less than 30% of requested resources</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Pod Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Namespace</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">CPU Requested</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">CPU Used</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Memory Requested</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Memory Used</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : overProvisionedPods.length > 0 ? (
                overProvisionedPods.map((pod) => (
                  <tr key={`${pod.namespace}-${pod.name}`} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-sm text-white font-medium">{pod.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{pod.namespace}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{pod.cpu_requested.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{pod.cpu_usage.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{pod.memory_requested.toFixed(0)} MB</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{pod.memory_usage.toFixed(0)} MB</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="inline-block px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs font-semibold">
                        {(pod.efficiency * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    All pods are efficiently provisioned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
