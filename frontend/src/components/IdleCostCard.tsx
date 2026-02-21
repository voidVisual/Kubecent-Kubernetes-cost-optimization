import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { IdleCostResponse, ApiError } from '../types/api';

interface Props {
  data: IdleCostResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function IdleCostCard({ data, loading, error }: Props) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Failed to load</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">Idle Cost</h3>
        <AlertCircle className="w-5 h-5 text-orange-500" />
      </div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      ) : data ? (
        <>
          <p className="text-3xl font-bold text-gray-900">
            ${data.totalIdleCost.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {data.idlePercentage.toFixed(1)}% idle resources
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">No data</p>
      )}
    </div>
  );
}
