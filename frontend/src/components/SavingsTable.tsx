import React from 'react';
import type { SavingsResponse, ApiError } from '../types/api';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

interface Props {
  data: SavingsResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function SavingsTable({ data, loading, error }: Props) {
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
        Error loading recommendations: {error.message}
      </div>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
        <p className="text-sm text-gray-600">
          No optimization recommendations at this time
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Your cluster is well optimized!
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <TrendingDown className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Resource</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Recommendation</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Cost</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Savings</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Impact</th>
          </tr>
        </thead>
        <tbody>
          {data.recommendations.map((rec) => (
            <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(rec.severity)}
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getSeverityColor(rec.severity)}`}>
                    {rec.severity.toUpperCase()}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900\">{rec.resourceName}</p>
                  <p className="text-xs text-gray-500\">{rec.namespace}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900\">{rec.title}</p>
                  <p className="text-xs text-gray-600\">{rec.description}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                ${rec.currentCost.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-semibold text-green-700">
                ${rec.savings.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-semibold text-green-700">
                  -{rec.savingsPercentage.toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
