/**
 * Header component with navigation.
 */

import React from 'react'
import { TrendingUp, BarChart3, Activity, Zap, Server } from 'lucide-react'

interface HeaderProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'costs', label: 'Cost Allocation', icon: BarChart3 },
  { id: 'efficiency', label: 'Resource Efficiency', icon: Activity },
  { id: 'nodes', label: 'Nodes & Pods', icon: Server },
  { id: 'savings', label: 'Savings', icon: Zap },
]

export function Header({ currentPage, onNavigate }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4 mb-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">KubeCent</h1>
              <p className="text-xs text-gray-400">Kubernetes Cost Optimization Platform</p>
            </div>
          </div>

          <div className="text-right text-sm text-gray-400">
            <p>Cluster: production</p>
            <p>Region: us-east-1</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex gap-1 border-t border-gray-700 overflow-x-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`px-4 py-3 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                currentPage === id
                  ? 'border-blue-600 text-blue-400 bg-gray-700/50'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
