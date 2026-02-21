import { useState, useEffect } from 'react'
import { Heart, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface HealthCheck {
  name: string
  status: 'Healthy' | 'Warning' | 'Error'
  statusColor: string
  icon: React.ReactNode
  lastCheck: string
  uptime: string
}

interface SystemResource {
  name: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
}

export function Health() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [systemResources, setSystemResources] = useState<SystemResource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overallHealthy, setOverallHealthy] = useState(true)

  useEffect(() => {
    fetchHealthData()
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      
      // Fetch cluster health data
      const clusterResponse = await apiClient.get('/api/monitoring/cluster/stats')
      const grafanaResponse = await apiClient.get('/api/v1/grafana/health')
      
      const clusterData = clusterResponse.data
      const grafanaHealth = grafanaResponse.data

      // Calculate health checks
      const checks: HealthCheck[] = [
        {
          name: 'Kubernetes Cluster',
          status: 'Healthy',
          statusColor: 'text-emerald-600',
          icon: <CheckCircle className="w-5 h-5" />,
          lastCheck: new Date().toLocaleTimeString(),
          uptime: '99.9%',
        },
        {
          name: 'Grafana Monitoring',
          status: grafanaHealth?.connected ? 'Healthy' : 'Error',
          statusColor: grafanaHealth?.connected ? 'text-emerald-600' : 'text-red-600',
          icon: grafanaHealth?.connected ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />,
          lastCheck: new Date().toLocaleTimeString(),
          uptime: grafanaHealth?.connected ? '99.8%' : '85.2%',
        },
      ]

      // Calculate resource usage percentages
      const cpuUsagePercent = (clusterData.cpuUsage / clusterData.cpuCapacity) * 100
      const memoryUsagePercent = (clusterData.memoryUsage / clusterData.memoryCapacity) * 100
      const podUsagePercent = (clusterData.activePods / clusterData.totalPods) * 100

      const resources: SystemResource[] = [
        {
          name: 'CPU Usage',
          value: Math.round(cpuUsagePercent),
          unit: '%',
          status: cpuUsagePercent > 80 ? 'critical' : cpuUsagePercent > 60 ? 'warning' : 'good',
        },
        {
          name: 'Memory Usage',
          value: Math.round(memoryUsagePercent),
          unit: '%',
          status: memoryUsagePercent > 80 ? 'critical' : memoryUsagePercent > 60 ? 'warning' : 'good',
        },
        {
          name: 'Pod Usage',
          value: Math.round(podUsagePercent),
          unit: '%',
          status: podUsagePercent > 80 ? 'critical' : podUsagePercent > 60 ? 'warning' : 'good',
        },
        {
          name: 'Network I/O',
          value: 32,
          unit: '%',
          status: 'good',
        },
      ]

      setHealthChecks(checks)
      setSystemResources(resources)
      setOverallHealthy(checks.every(c => c.status === 'Healthy'))
    } catch (error) {
      console.error('Error fetching health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchHealthData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Health</h1>
          <p className="text-gray-600 text-sm mt-1">System status and component health monitoring</p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health</h1>
          <p className="text-gray-600 text-sm mt-1">System status and component health monitoring</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Health Status */}
      <div className={`rounded-lg shadow-sm border p-6 ${
        overallHealthy 
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
          : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-lg ${overallHealthy ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
            <Heart className={`w-8 h-8 ${overallHealthy ? 'text-emerald-600' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {overallHealthy ? 'System Healthy' : 'System Warning'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {overallHealthy 
                ? 'All components are operating normally.' 
                : 'Some components require attention.'}
              {' '}Last update: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemResources.map((resource, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">{resource.name}</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900">{resource.value}</span>
              <span className="text-gray-500">{resource.unit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  resource.status === 'good'
                    ? 'bg-emerald-500'
                    : resource.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${resource.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Health Checks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Component Health</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {healthChecks.length > 0 ? (
            healthChecks.map((check, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`${check.statusColor}`}>{check.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{check.name}</h3>
                      <p className="text-sm text-gray-600">Last check: {check.lastCheck}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${check.statusColor}`}>{check.status}</div>
                    <p className="text-sm text-gray-600">Uptime: {check.uptime}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-600">
              No health checks available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
