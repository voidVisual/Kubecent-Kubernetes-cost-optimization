import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ApiError } from '../types/api';

interface Props {
  error: ApiError | null;
  onRetry?: () => void;
}

export function ErrorAlert({ error, onRetry }: Props) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900">Error Loading Data</h3>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
          {error.statusCode && (
            <p className="text-xs text-red-600 mt-1">
              Status Code: {error.statusCode}
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
