/**
 * Namespaces cost breakdown component.
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useNamespaceCosts } from '../hooks/useApi'
import { formatCurrency, formatPercent } from '../utils/format'

export function Namespaces() {
  const { data: namespaces, loading, error } = useNamespaceCosts()

  if (loading) {
    return <div className="text-center py-8">Loading namespace data...</div>
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

  const total = namespaces.reduce((sum, ns) => sum + ns.allocation.total_cost, 0)

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Namespace Costs</h2>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="text-left p-4 font-semibold">Namespace</th>
                <th className="text-left p-4 font-semibold">Pods</th>
                <th className="text-right p-4 font-semibold">CPU Cost</th>
                <th className="text-right p-4 font-semibold">Memory Cost</th>
                <th className="text-right p-4 font-semibold">Storage Cost</th>
                <th className="text-right p-4 font-semibold">Total Cost</th>
                <th className="text-right p-4 font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {namespaces.map((ns) => (
                <tr key={ns.namespace} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="p-4 font-medium">{ns.namespace}</td>
                  <td className="p-4 text-gray-300">{ns.pod_count}</td>
                  <td className="p-4 text-right text-gray-300">
                    {formatCurrency(ns.allocation.cpu_cost)}
                  </td>
                  <td className="p-4 text-right text-gray-300">
                    {formatCurrency(ns.allocation.memory_cost)}
                  </td>
                  <td className="p-4 text-right text-gray-300">
                    {formatCurrency(ns.allocation.storage_cost)}
                  </td>
                  <td className="p-4 text-right font-bold text-blue-400">
                    {formatCurrency(ns.allocation.total_cost)}
                  </td>
                  <td className="p-4 text-right text-gray-300">
                    {formatPercent(ns.allocation.total_cost, total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 p-4 rounded-lg">
        <p className="text-sm">
          <span className="font-semibold">Total Cluster Cost:</span>{' '}
          {formatCurrency(total)}
        </p>
      </div>
    </div>
  )
}
