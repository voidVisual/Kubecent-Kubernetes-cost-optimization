import React from 'react';
import type { AssetsResponse, ApiError } from '../types/api';
import { LoadingSpinner } from './LoadingSpinner';
import { Server } from 'lucide-react';

interface Props {
  data: AssetsResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function NodeCostBreakdown({ data, loading, error }: Props) {
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
        Error loading node costs: {error.message}
      </div>
    );
  }

  if (!data || data.assets.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No node data available
      </div>
    );
  }

  const nodes = data.assets.filter((asset) => asset.type === 'node');

  return (
    <div className="space-y-3">
      {nodes.map((node) => (
        <div
          key={node.name}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-900">{node.name}</h4>
            </div>
            <span className="text-lg font-bold text-gray-900">
              ${node.costs.total.toFixed(2)}
            </span>
          </div>
          {node.instanceType && (
            <p className="text-xs text-gray-500 mb-2">{node.instanceType}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">CPU:</span>{' '}
              <span className="font-medium text-gray-900\">${node.costs.cpu.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600\">Memory:</span>{' '}
              <span className="font-medium text-gray-900\">${node.costs.memory.toFixed(2)}</span>
            </div>
            {node.hourlyRate && (
              <div className="col-span-2">
                <span className="text-gray-600\">Hourly rate:</span>{' '}
                <span className="font-medium text-gray-900\">${node.hourlyRate.toFixed(3)}/hr</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
