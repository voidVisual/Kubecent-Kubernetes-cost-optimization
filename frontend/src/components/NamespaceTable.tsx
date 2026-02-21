import React from 'react';
import type { AllocationsResponse, ApiError } from '../types/api';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  data: AllocationsResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function NamespaceTable({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-4">
        Error loading namespace costs: {error.message}
      </div>
    );
  }

  if (!data || data.allocations.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No namespace data available
      </div>
    );
  }

  // Group by namespace and sum costs
  const namespaceMap = new Map<string, {
    namespace: string;
    cost: number;
    cpuCost: number;
    memoryCost: number;
    pods: number;
  }>();

  data.allocations.forEach((item) => {
    const existing = namespaceMap.get(item.namespace) || {
      namespace: item.namespace,
      cost: 0,
      cpuCost: 0,
      memoryCost: 0,
      pods: 0,
    };

    existing.cost += item.costs.total;
    existing.cpuCost += item.costs.cpu;
    existing.memoryCost += item.costs.memory;
    existing.pods += 1;

    namespaceMap.set(item.namespace, existing);
  });

  const namespaces = Array.from(namespaceMap.values()).sort((a, b) => b.cost - a.cost);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Namespace</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Pods</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">CPU Cost</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Memory Cost</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {namespaces.map((ns) => (
            <tr key={ns.namespace} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium text-gray-900">{ns.namespace}</td>
              <td className="py-3 px-4 text-right text-gray-700">{ns.pods}</td>
              <td className="py-3 px-4 text-right text-gray-700">
                ${ns.cpuCost.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                ${ns.memoryCost.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                ${ns.cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
