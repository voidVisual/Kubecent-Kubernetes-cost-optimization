import React from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import type { AllocationsResponse, AssetsResponse } from '../types/api';

interface Props {
  allocations: AllocationsResponse | null;
  assets: AssetsResponse | null;
  loading: boolean;
}

export function TotalCostCard({ allocations, assets, loading }: Props) {
  const totalCost = (allocations?.totalCost || 0) + (assets?.totalCost || 0);
  const currency = allocations?.currency || assets?.currency || 'USD';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">Total Cluster Cost</h3>
        <DollarSign className="w-5 h-5 text-blue-600" />
      </div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-gray-900">
            ${totalCost.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {allocations?.window || '7 days'}
          </p>
        </>
      )}
    </div>
  );
}