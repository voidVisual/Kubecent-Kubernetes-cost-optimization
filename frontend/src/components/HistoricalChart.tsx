import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryResponse, ApiError, TimeRange } from '../types/api';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  data: HistoryResponse | null;
  loading: boolean;
  error: ApiError | null;
  range: TimeRange;
}

export function HistoricalChart({ data, loading, error, range }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-8 text-center">
        Error loading historical data: {error.message}
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-12 text-center">
        No historical data available
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.data.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    'Total Cost': parseFloat(point.cost.toFixed(2)),
    'CPU': parseFloat(point.cpuCost.toFixed(2)),
    'Memory': parseFloat(point.memoryCost.toFixed(2)),
    'Storage': parseFloat(point.storageCost.toFixed(2)),
  }));

  return (
    <div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Total Cost"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="CPU"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Memory"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Storage"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.aggregation && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Min:</span>{' '}
            <span className="font-semibold text-gray-900">${data.aggregation.min.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Max:</span>{' '}
            <span className="font-semibold text-gray-900">${data.aggregation.max.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg:</span>{' '}
            <span className="font-semibold text-gray-900">${data.aggregation.avg.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Total:</span>{' '}
            <span className="font-semibold text-gray-900">${data.aggregation.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
