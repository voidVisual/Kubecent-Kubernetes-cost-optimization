import { useState, useEffect } from 'react'
import { Terminal, FileText, RefreshCw, Filter } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface LogEntry {
  timestamp: string
  namespace: string
  pod: string
  message: string
  level: string
}

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNamespace, setSelectedNamespace] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const namespaces = ['all', 'default', 'kube-system', 'monitoring', 'production', 'kubecent']
  const levels = ['all', 'ERROR', 'WARNING', 'INFO', 'DEBUG']

  useEffect(() => {
    fetchLogs()
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedNamespace, autoRefresh])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const namespace = selectedNamespace === 'all' ? null : selectedNamespace
      const params = namespace 
        ? { namespace, limit: 200, since_seconds: 3600 } 
        : { limit: 200, since_seconds: 3600 }
      const response = await apiClient.get('/api/monitoring/logs', { params })
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLogs()
    setRefreshing(false)
  }

  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-red-400 bg-red-900/20'
      case 'WARNING':
        return 'text-yellow-400 bg-yellow-900/20'
      case 'INFO':
        return 'text-blue-400 bg-blue-900/20'
      case 'DEBUG':
        return 'text-gray-400 bg-gray-800/20'
      default:
        return 'text-gray-400 bg-gray-800/20'
    }
  }

  const filteredLogs = selectedLevel === 'all'
    ? logs
    : logs.filter(log => log.level.toUpperCase() === selectedLevel)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cluster Logs</h1>
          <p className="text-gray-600">Real-time logs from your Kubernetes cluster</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Namespace Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Namespace
            </label>
            <div className="flex flex-wrap gap-2">
              {namespaces.map((ns) => (
                <button
                  key={ns}
                  onClick={() => setSelectedNamespace(ns)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedNamespace === ns
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {ns}
                </button>
              ))}
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Level
            </label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedLevel === level
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Logs</h3>
            <Terminal className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Errors</h3>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.level.toUpperCase() === 'ERROR').length}
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Warnings</h3>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {logs.filter(l => l.level.toUpperCase() === 'WARNING').length}
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Info</h3>
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.level.toUpperCase() === 'INFO').length}
          </p>
        </div>
      </div>

      {/* Logs Viewer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Log Stream</h2>
          </div>
          <div className="text-sm text-gray-500">
            {autoRefresh && 'Auto-refreshing every 5s'}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No logs available</div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {filteredLogs.map((log, idx) => (
                <div key={idx} className="text-gray-300 hover:bg-gray-800 p-2 rounded transition-colors">
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {' '}
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  {' '}
                  <span className="text-blue-400">[{log.namespace}/{log.pod}]</span>
                  {' '}
                  <span className="text-gray-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
