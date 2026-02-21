import React from 'react';
import { Activity } from 'lucide-react';
import type { EfficiencyResponse, ApiError } from '../types/api';

interface Props {
  data: EfficiencyResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function EfficiencyCard({ data, loading, error }: Props) {
  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-sm text-red-600">Failed to load</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">Efficiency Score</h3>
        <Activity className="w-5 h-5 text-purple-500" />
      </div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ) : data ? (
        <>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {data.overallScore.toFixed(0)}%
            </p>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${getGradeColor(data.grade)}`}>
              {data.grade}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Overall cluster efficiency
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">No data</p>
      )}
    </div>
  );
}
