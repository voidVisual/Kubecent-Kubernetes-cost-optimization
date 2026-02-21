import React, { useState } from 'react';
import { Activity, Server, Filter } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface NodeData {
  node: string;
  status: string;
  cpu_capacity: number;
  cpu_used: number;
  memory_capacity: number;
  memory_used: number;
  pod_count: number;
}

export function NodesAndPods() {
  const { data: nodes, loading: nodesLoading } = useApi('/api/v1/metrics/nodes');
  const { data: pods, loading: podsLoading } = useApi('/api/v1/metrics/pods');
  const [viewMode, setViewMode] = useState<'nodes' | 'pods'>('nodes');

  const nodeData: NodeData[] =
    nodes?.map((node: any) => ({
      node: node.node,
      status: node.status,
      cpu_capacity: node.cpu_capacity,
      cpu_used: node.cpu_used,
      memory_capacity: node.memory_capacity,
      memory_used: node.memory_used,
      pod_count: node.pod_count,
    })) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'bg-green-900/20 text-green-400 border-green-500/30';
      case 'NotReady':
        return 'bg-red-900/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getUtilizationColor = (used: number, capacity: number) => {
    const percentage = (used / capacity) * 100;
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const UtilizationBar = ({ used, capacity, label }: { used: number; capacity: number; label: string }) => {
    const percentage = (used / capacity) * 100;
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">{label}</span>
          <span className="text-xs font-semibold text-gray-300">
            {used.toFixed(2)} / {capacity.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentage >= 80 ? 'bg-red-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nodes & Pods</h1>
        <p className="text-gray-400">Monitor node health and pod resource usage</p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setViewMode('nodes')}
          className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
            viewMode === 'nodes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Server className="w-5 h-5" />
          Nodes ({nodeData.length})
        </button>
        <button
          onClick={() => setViewMode('pods')}
          className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
            viewMode === 'pods'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Activity className="w-5 h-5" />
          Pods ({pods?.length || 0})
        </button>
      </div>

      {/* Nodes View */}
      {viewMode === 'nodes' && (
        <div className="space-y-4">
          {nodesLoading ? (
            <div className="text-center text-gray-400 py-8">Loading nodes...</div>
          ) : nodeData.length > 0 ? (
            nodeData.map((node) => (
              <div
                key={node.node}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Server className="w-6 h-6 text-blue-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{node.node}</h3>
                      <p className="text-sm text-gray-400 mt-1">{node.pod_count} pods running</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(node.status)}`}>
                    {node.status}
                  </span>
                </div>

                <UtilizationBar
                  used={node.cpu_used}
                  capacity={node.cpu_capacity}
                  label="CPU Usage"
                />
                <UtilizationBar
                  used={node.memory_used}
                  capacity={node.memory_capacity}
                  label="Memory Usage"
                />

                <div className="mt-4 p-3 bg-gray-900/50 rounded text-xs text-gray-400">
                  <p>CPU: {((node.cpu_used / node.cpu_capacity) * 100).toFixed(1)}% used</p>
                  <p>Memory: {((node.memory_used / node.memory_capacity) * 100).toFixed(1)}% used</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">No nodes found</div>
          )}
        </div>
      )}

      {/* Pods View */}
      {viewMode === 'pods' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Pod Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Namespace</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">CPU Usage</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Memory Usage</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Network In</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Network Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {podsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : pods && pods.length > 0 ? (
                  pods.map((pod: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 text-sm text-white font-medium">{pod.pod}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{pod.namespace}</td>
                      <td className="px-6 py-4 text-sm text-gray-300 text-right">
                        <span className="font-mono">{pod.cpu_usage.toFixed(2)} / {pod.cpu_requested.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 text-right">
                        <span className="font-mono">{pod.memory_usage.toFixed(0)} / {pod.memory_requested.toFixed(0)} MB</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 text-right">
                        <span className="font-mono">{(pod.network_in / 1024).toFixed(1)} KB/s</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 text-right">
                        <span className="font-mono">{(pod.network_out / 1024).toFixed(1)} KB/s</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No pods found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
