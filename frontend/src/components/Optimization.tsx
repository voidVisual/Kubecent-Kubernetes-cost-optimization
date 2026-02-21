/**
 * Optimization recommendations component.
 */

import React from 'react'
import { AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { useOptimizationReport } from '../hooks/useApi'
import { formatCurrency, getPriorityBadgeClass } from '../utils/format'

export function Optimization() {
  const { data: report, loading, error } = useOptimizationReport()

  if (loading) {
    return <div className="text-center py-8">Analyzing cluster for optimization opportunities...</div>
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 p-4 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Error loading data</h3>
          <p className="text-sm text-gray-300">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return <div className="text-center py-8">No recommendations available</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Optimization Recommendations</h2>

      {/* Summary Card */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-2">Total Suggestions</div>
            <div className="text-3xl font-bold">{report.total_suggestions}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-2">Estimated Monthly Savings</div>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(report.estimated_total_savings)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-2">Potential Annual Savings</div>
            <div className="text-3xl font-bold text-green-500">
              {formatCurrency(report.estimated_total_savings * 12)}
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        {report.suggestions.length === 0 ? (
          <div className="card p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-300">No optimization opportunities detected!</p>
            <p className="text-sm text-gray-400">Your cluster is running efficiently.</p>
          </div>
        ) : (
          report.suggestions.map((suggestion, idx) => (
            <div key={idx} className="card p-6">
              <div className="flex gap-4">
                <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-semibold text-lg">{suggestion.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityBadgeClass(suggestion.priority)}`}>
                      {suggestion.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">{suggestion.description}</p>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Category</span>
                      <p className="text-sm text-gray-200">{suggestion.category}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Est. Savings</span>
                      <p className="text-sm text-green-400 font-semibold">
                        {formatCurrency(suggestion.estimated_savings)}/month
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Affected Resources</span>
                      <p className="text-sm text-gray-200">
                        {suggestion.affected_resources.slice(0, 2).join(', ')}
                        {suggestion.affected_resources.length > 2 && ` +${suggestion.affected_resources.length - 2}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
