import { useState, useEffect } from 'react'
import { Activity, Zap, Database, Network, ExternalLink, CheckCircle, XCircle, Settings, RefreshCw, TrendingUp, AlertTriangle, Server, Cpu } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GrafanaHealth {
  connected: boolean
  status: string
  message: string
  url: string | null
  version?: string
}

interface ClusterStats {
  activePods: number
  totalPods: number
  cpuUsage: number
  cpuCapacity: number
  memoryUsage: number
  memoryCapacity: number
  networkIO: string
  nodes: number
}

interface Pod {
  name: string
  namespace: string
  status: string
  cpu: string
  memory: string
  age: string
  restarts: number
  node?: string
}

interface Node {
  name: string
  status: string
  cpu: string
  memory: string
  cpuCapacity?: string
  memoryCapacity?: string
  instanceType?: string
  zone?: string
}

export function Monitor() {
  const [selectedNamespace, setSelectedNamespace] = useState('all')
  const [grafanaHealth, setGrafanaHealth] = useState<GrafanaHealth | null>(null)
  const [showSetupInstructions, setShowSetupInstructions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [cpuHistory, setCpuHistory] = useState<any[]>([])
  const [memoryHistory, setMemoryHistory] = useState<any[]>([])

  const namespaces = [
    { id: 'all', name: 'All Namespaces' },
    { id: 'default', name: 'default' },
    { id: 'kube-system', name: 'kube-system' },
    { id: 'monitoring', name: 'monitoring' },
    { id: 'production', name: 'production' },
    { id: 'kubecent', name: 'kubecent' },
  ]

  useEffect(() => {
    fetchAllData()
    initializeHistoryData()
    const interval = setInterval(() => {
      fetchAllData()
      updateHistoryData()
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedNamespace])

  const initializeHistoryData = () => {
    const now = Date.now()
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(now - (19 - i) * 30000).toLocaleTimeString(),
      cpu: Math.random() * 8 + 2,
      memory: Math.random() * 20 + 10,
    }))
    setCpuHistory(initialData)
    setMemoryHistory(initialData)
  }

  const updateHistoryData = () => {
    if (clusterStats) {
      const newDataPoint = {
        time: new Date().toLocaleTimeString(),
        cpu: clusterStats.cpuUsage,
        memory: clusterStats.memoryUsage,
      }
      
      setCpuHistory(prev => [...prev.slice(-19), newDataPoint])
      setMemoryHistory(prev => [...prev.slice(-19), newDataPoint])
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      checkGrafanaHealth(),
      fetchClusterStats(),
      fetchPods(),
      fetchNodes()
    ])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
  }

  const checkGrafanaHealth = async () => {
    try {
      const response = await apiClient.get('/api/v1/grafana/health')
      setGrafanaHealth(response.data)
    } catch (error) {
      setGrafanaHealth({
        connected: false,
        status: 'error',
        message: 'Failed to check Grafana status',
        url: null
      })
    }
  }

  const fetchClusterStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/monitoring/cluster/stats')
      setClusterStats(response.data)
    } catch (error) {
      console.error('Error fetching cluster stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPods = async () => {
    try {
      const namespace = selectedNamespace === 'all' ? null : selectedNamespace
      const params = namespace ? { namespace } : {}
      const response = await apiClient.get('/api/monitoring/pods', { params })
      setPods(response.data.pods || [])
    } catch (error) {
      console.error('Error fetching pods:', error)
    }
  }

  const fetchNodes = async () => {
    try {
      const response = await apiClient.get('/api/monitoring/nodes')
      setNodes(response.data.nodes || [])
    } catch (error) {
      console.error('Error fetching nodes:', error)
    }
  }

  const metrics = clusterStats ? [
    {
      label: 'Active Pods',
      value: clusterStats.activePods.toString(),
      icon: <Database className="w-5 h-5" />,
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      label: 'CPU Usage',
      value: `${clusterStats.cpuUsage.toFixed(1)} / ${clusterStats.cpuCapacity} cores`,
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-orange-100',
      textColor: 'text-orange-700',
    },
    {
      label: 'Memory Usage',
      value: `${clusterStats.memoryUsage.toFixed(1)} / ${clusterStats.memoryCapacity} GB`,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-purple-100',
      textColor: 'text-purple-700',
    },
    {
      label: 'Network I/O',
      value: clusterStats.networkIO,
      icon: <Network className="w-5 h-5" />,
      color: 'bg-green-100',
      textColor: 'text-green-700',
    },
  ] : []

  const filteredPods = selectedNamespace === 'all' 
    ? pods 
    : pods.filter(pod => pod.namespace === selectedNamespace)

  // Pod status distribution for pie chart
  const podStatusData = [
    { name: 'Running', value: pods.filter(p => p.status === 'Running').length, color: '#10b981' },
    { name: 'Pending', value: pods.filter(p => p.status === 'Pending').length, color: '#f59e0b' },
    { name: 'Failed', value: pods.filter(p => p.status === 'Failed').length, color: '#ef4444' },
    { name: 'Succeeded', value: pods.filter(p => p.status === 'Succeeded').length, color: '#3b82f6' },
  ].filter(item => item.value > 0)

  // Namespace distribution
  const namespaceData = selectedNamespace === 'all' 
    ? namespaces.slice(1).map(ns => ({
        name: ns.name,
        pods: pods.filter(p => p.namespace === ns.id).length
      })).filter(item => item.pods > 0)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitor</h1>
          <p className="text-gray-600 text-sm mt-1">Real-time cluster monitoring and pod metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Grafana Monitoring Dashboards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
              Grafana Monitoring Dashboards
              {!loading && grafanaHealth && (
                <span className="flex items-center gap-1.5 text-sm font-normal">
                  {grafanaHealth.connected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-700">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700">Not Connected</span>
                    </>
                  )}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {grafanaHealth?.connected
                ? 'Access detailed metrics and visualizations'
                : 'Set up Grafana to view monitoring dashboards'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Setup Instructions
            </button>
            {grafanaHealth?.connected && (
              <a
                href={grafanaHealth.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Go to Dashboards
              </a>
            )}
          </div>
        </div>

        {/* Setup Instructions Panel */}
        {showSetupInstructions && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Grafana Setup Instructions
            </h3>
            <div className="space-y-3 text-sm text-blue-900">
              <div>
                <p className="font-medium mb-1">Quick Setup (using Helm):</p>
                <div className="bg-blue-900 text-blue-50 p-3 rounded font-mono text-xs overflow-x-auto">
                  <div>helm repo add prometheus-community https://prometheus-community.github.io/helm-charts</div>
                  <div>helm repo update</div>
                  <div>helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace</div>
                  <div className="mt-2"># Port forward to access Grafana</div>
                  <div>kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80</div>
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Default Credentials:</p>
                <p>Username: <code className="bg-blue-100 px-2 py-0.5 rounded">admin</code> | Password: <code className="bg-blue-100 px-2 py-0.5 rounded">prom-operator</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Cluster Overview', description: 'Overall cluster health and resources', path: '/d/cluster-overview' },
            { title: 'Pod Metrics', description: 'CPU, memory, and network metrics', path: '/d/pod-metrics' },
            { title: 'Cost Analysis', description: 'Resource cost breakdown and trends', path: '/d/cost-analysis' },
            { title: 'Node Performance', description: 'Node-level resource utilization', path: '/d/node-performance' },
          ].map((dashboard, idx) => (
            <a
              key={idx}
              href={grafanaHealth?.connected ? `${grafanaHealth.url}${dashboard.path}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg transition-all group ${
                grafanaHealth?.connected
                  ? 'hover:bg-gray-50 hover:border-gray-300'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={(e) => !grafanaHealth?.connected && e.preventDefault()}
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{dashboard.title}</h3>
                <p className="text-xs text-gray-600">{dashboard.description}</p>
              </div>
              <ExternalLink className={`w-4 h-4 ${grafanaHealth?.connected ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
            </a>
          ))}
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">{metric.label}</h3>
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <div className={metric.textColor}>{metric.icon}</div>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Resource Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-bold text-gray-900">CPU Usage Trend</h2>
            </div>
            <div className="text-sm text-gray-600">
              {clusterStats && `${clusterStats.cpuUsage.toFixed(1)} / ${clusterStats.cpuCapacity} cores`}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Cores', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#f97316" strokeWidth={2} fill="url(#cpuGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Memory Usage Trend</h2>
            </div>
            <div className="text-sm text-gray-600">
              {clusterStats && `${clusterStats.memoryUsage.toFixed(1)} / ${clusterStats.memoryCapacity} GB`}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={memoryHistory}>
              <defs>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'GB', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} fill="url(#memGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pod Status & Namespace Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pod Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Pod Status Distribution</h2>
          </div>
          {podStatusData.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={podStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {podStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {podStatusData.map((item, idx) => {
                  const colorClasses: Record<string, string> = {
                    '#10b981': 'bg-emerald-500',
                    '#f59e0b': 'bg-amber-500',
                    '#ef4444': 'bg-red-500',
                    '#3b82f6': 'bg-blue-500',
                  }
                  const className = colorClasses[item.color as keyof typeof colorClasses] || 'bg-gray-500'
                  
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${className}`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total Pods</span>
                    <span className="text-lg font-bold text-gray-900">{pods.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">No pod data available</div>
          )}
        </div>

        {/* Namespace Pod Distribution */}
        {selectedNamespace === 'all' && namespaceData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Pods by Namespace</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={namespaceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="pods" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cluster Health Summary - shown when namespace is selected */}
        {selectedNamespace !== 'all' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-bold text-gray-900">Cluster Health</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-emerald-900">Healthy Pods</div>
                    <div className="text-sm text-emerald-700">Running without issues</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-900">
                  {pods.filter(p => p.status === 'Running' && p.restarts === 0).length}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                  <div>
                    <div className="font-semibold text-yellow-900">Pods with Restarts</div>
                    <div className="text-sm text-yellow-700">May need attention</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {pods.filter(p => p.restarts > 0).length}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-900">Failed/Pending Pods</div>
                    <div className="text-sm text-red-700">Require immediate action</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {pods.filter(p => p.status !== 'Running').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pod Monitoring */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Pod Monitoring</h2>

        {/* Namespace Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {namespaces.map((ns) => (
            <button
              key={ns.id}
              onClick={() => setSelectedNamespace(ns.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedNamespace === ns.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ns.name}
            </button>
          ))}
        </div>

        {/* Pods Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">POD NAME</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">NAMESPACE</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">STATUS</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">CPU</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">MEMORY</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">AGE</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">RESTARTS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No pods found in this namespace
                  </td>
                </tr>
              ) : (
                filteredPods.map((pod, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{pod.name}</td>
                    <td className="py-3 px-4 text-gray-700">{pod.namespace}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 ${
                        pod.status === 'Running' ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          pod.status === 'Running' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></span>
                        {pod.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{pod.cpu}</td>
                    <td className="py-3 px-4 text-gray-700">{pod.memory}</td>
                    <td className="py-3 px-4 text-gray-700">{pod.age}</td>
                    <td className="py-3 px-4 text-gray-700">{pod.restarts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Node Status</h2>
        {nodes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No nodes found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nodes.map((node, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{node.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-sm ${
                    node.status === 'Ready' ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      node.status === 'Ready' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></span>
                    {node.status}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-gray-600 mb-3">
                  {node.instanceType && <div>Type: {node.instanceType}</div>}
                  {node.zone && <div>Zone: {node.zone}</div>}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>CPU</span>
                      <span>{node.cpu}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: node.cpu }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Memory</span>
                      <span>{node.memory}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: node.memory }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
