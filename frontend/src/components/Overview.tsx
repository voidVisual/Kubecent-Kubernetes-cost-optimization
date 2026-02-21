/**
 * Dashboard overview component.
 */

import React from 'react'
import { TrendingUp, AlertCircle, Activity } from 'lucide-react'
import { useClusterCost } from '../hooks/useApi'
import { formatCurrency } from '../utils/format'

export function Overview() {
  const { data: clusterCost, loading, error } = useClusterCost()

  if (loading) {
    return <div className="text-center py-8">Loading cluster data...</div>
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

  if (!clusterCost) {
    return <div className="text-center py-8">No data available</div>
  }

  const { allocation } = clusterCost

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Cluster Overview</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          icon={<Activity className="w-6 h-6" />}
          title="Total Cost"
          value={formatCurrency(allocation.total_cost)}
          subtitle="Monthly estimate"
        />
        <Card
          icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
          title="CPU Cost"
          value={formatCurrency(allocation.cpu_cost)}
          subtitle="Current month"
        />
        <Card
          icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
          title="Memory Cost"
          value={formatCurrency(allocation.memory_cost)}
          subtitle="Current month"
        />
        <Card
          icon={<TrendingUp className="w-6 h-6 text-green-400" />}
          title="Namespaces"
          value={clusterCost.namespaces.toString()}
          subtitle={`${clusterCost.pods} pods`}
        />
      </div>

      {/* Cost Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-6">Cost Breakdown</h3>
        <div className="space-y-4">
          <CostBreakdownItem
            label="CPU"
            value={allocation.cpu_cost}
            total={allocation.total_cost}
          />
          <CostBreakdownItem
            label="Memory"
            value={allocation.memory_cost}
            total={allocation.total_cost}
          />
          <CostBreakdownItem
            label="Storage"
            value={allocation.storage_cost}
            total={allocation.total_cost}
          />
          <CostBreakdownItem
            label="Network"
            value={allocation.network_cost}
            total={allocation.total_cost}
          />
        </div>
      </div>
    </div>
  )
}

interface CardProps {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
}

function Card({ icon, title, value, subtitle }: CardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 font-medium">{title}</h3>
        <div className="text-blue-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-sm text-gray-400 mt-2">{subtitle}</p>
    </div>
  )
}

interface CostBreakdownItemProps {
  label: string
  value: number
  total: number
}

function CostBreakdownItem({ label, value, total }: CostBreakdownItemProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-400">
          {formatCurrency(value)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
