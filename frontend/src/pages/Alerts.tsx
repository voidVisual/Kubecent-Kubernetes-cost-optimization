import { useState, useEffect } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Trash2, Filter, Clock, RefreshCw } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  namespace: string
  value: string
  timestamp: string
  read: boolean
}

export function Alerts() {
  const [filterType, setFilterType] = useState('all')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      // Fetch real alerts from backend
      // For now, generate alerts based on real cluster data
      const statsResponse = await apiClient.get('/api/monitoring/cluster/stats')
      const podsResponse = await apiClient.get('/api/monitoring/pods')
      
      const generatedAlerts: Alert[] = []
      
      // Check for high CPU usage
      if (statsResponse.data.cpuUsage > statsResponse.data.cpuCapacity * 0.8) {
        generatedAlerts.push({
          id: 'cpu-high',
          type: 'efficiency',
          severity: 'warning',
          title: 'High CPU Usage',
          message: `CPU usage is at ${(statsResponse.data.cpuUsage / statsResponse.data.cpuCapacity * 100).toFixed(1)}% capacity`,
          namespace: 'cluster-wide',
          value: `${statsResponse.data.cpuUsage.toFixed(1)}/${statsResponse.data.cpuCapacity}`,
          timestamp: new Date().toLocaleTimeString(),
          read: false,
        })
      }

      // Check for high memory usage
      if (statsResponse.data.memoryUsage > statsResponse.data.memoryCapacity * 0.8) {
        generatedAlerts.push({
          id: 'mem-high',
          type: 'efficiency',
          severity: 'warning',
          title: 'High Memory Usage',
          message: `Memory usage is at ${(statsResponse.data.memoryUsage / statsResponse.data.memoryCapacity * 100).toFixed(1)}% capacity`,
          namespace: 'cluster-wide',
          value: `${statsResponse.data.memoryUsage.toFixed(1)}/${statsResponse.data.memoryCapacity}`,
          timestamp: new Date().toLocaleTimeString(),
          read: false,
        })
      }

      // Check for failed pods
      const failedPods = podsResponse.data.pods?.filter((p: any) => p.status !== 'Running') || []
      if (failedPods.length > 0) {
        generatedAlerts.push({
          id: 'pod-failures',
          type: 'health',
          severity: 'high',
          title: `${failedPods.length} Pod(s) Not Running`,
          message: `${failedPods.length} pod(s) are in a failed or pending state`,
          namespace: 'multiple',
          value: failedPods.length.toString(),
          timestamp: new Date().toLocaleTimeString(),
          read: false,
        })
      }

      // Check for pods with high restart count
      const restartingPods = podsResponse.data.pods?.filter((p: any) => p.restarts > 3) || []
      if (restartingPods.length > 0) {
        generatedAlerts.push({
          id: 'pod-restarts',
          type: 'policy',
          severity: 'warning',
          title: `${restartingPods.length} Pod(s) Restarting Frequently`,
          message: `${restartingPods.length} pod(s) have high restart counts`,
          namespace: 'multiple',
          value: restartingPods.length.toString(),
          timestamp: new Date().toLocaleTimeString(),
          read: false,
        })
      }

      setAlerts(generatedAlerts)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAlerts()
    setRefreshing(false)
  }

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const markAsRead = (id: string) => {
    setAlerts(
      alerts.map((a) => (a.id === id ? { ...a, read: true } : a))
    )
  }

  const filteredAlerts = filterType === 'all' 
    ? alerts 
    : alerts.filter((a) => a.type === filterType)

  const unreadCount = alerts.filter((a) => !a.read).length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'high':
        return 'bg-orange-50 border-orange-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'budget':
        return 'Budget Alert'
      case 'efficiency':
        return 'Efficiency'
      case 'policy':
        return 'Policy'
      case 'anomaly':
        return 'Anomaly'
      case 'health':
        return 'Health'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600 text-sm mt-1">Real-time alerts based on cluster monitoring data</p>
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600 text-sm mt-1">
            Real-time alerts based on cluster monitoring data
          </p>
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

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{alerts.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Unread</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{unreadCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Critical</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {alerts.filter((a) => a.severity === 'critical').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Read</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {alerts.filter((a) => a.read).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilterType('budget')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'budget'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => setFilterType('policy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'policy'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Policy
          </button>
          <button
            onClick={() => setFilterType('efficiency')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'efficiency'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Efficiency
          </button>
          <button
            onClick={() => setFilterType('anomaly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'anomaly'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Anomalies
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} ${
                !alert.read ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        {getTypeLabel(alert.type)}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        {alert.namespace}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        {alert.value}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock size={12} />
                        {alert.timestamp}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!alert.read && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    title="Dismiss alert"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts</h3>
            <p className="text-gray-600">Everything is running smoothly! No alerts at this moment.</p>
          </div>
        )}
      </div>

      {/* Alert History */}
      {alerts.filter((a) => a.read).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Read Alerts</h2>
          <div className="space-y-2">
            {alerts
              .filter((a) => a.read)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Dismiss alert"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
