import React, { useState, useEffect } from 'react'
import { Server, Activity, Zap, Database, Network, AlertCircle, BarChart3, ExternalLink, CheckCircle, XCircle, Settings } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface GrafanaHealth {
  connected: boolean
  status: string
  message: string
  url: string | null
  version?: string
}

export function Monitor() {
  const [selectedNamespace, setSelectedNamespace] = useState('all')
  const [grafanaHealth, setGrafanaHealth] = useState<GrafanaHealth | null>(null)
  const [showSetupInstructions, setShowSetupInstructions] = useState(false)
  const [loading, setLoading] = useState(true)

  const namespaces = [
    { id: 'all', name: 'All Namespaces' },
    { id: 'default', name: 'default' },
    { id: 'kube-system', name: 'kube-system' },
    { id: 'monitoring', name: 'monitoring' },
    { id: 'production', name: 'production' },
  ]

  const pods = [
    {
      name: 'nginx-deployment-1',
      namespace: 'production',
      status: 'Running',
      cpu: '245m',
      memory: '512Mi',
      age: '5d',
      restarts: 0,
    },
    {
      name: 'api-service-2',
      namespace: 'production',
      status: 'Running',
      cpu: '1200m',
      memory: '2Gi',
      age: '3d',
      restarts: 1,
    },
    {
      name: 'database-0',
      namespace: 'production',
      status: 'Running',
      cpu: '2000m',
      memory: '4Gi',
      age: '10d',
      restarts: 0,
    },
    {
      name: 'redis-cache-1',
      namespace: 'default',
      status: 'Running',
      cpu: '500m',
      memory: '1Gi',
      age: '7d',
      restarts: 0,
    },
  ]

  const metrics = [
    {
      label: 'Active Pods',
      value: '42',
      icon: <Database className="w-5 h-5" />,
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      label: 'CPU Usage',
      value: '4.2 / 8 cores',
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-orange-100',
      textColor: 'text-orange-700',
    },
    {
      label: 'Memory Usage',
      value: '12.5 / 32 GB',
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-purple-100',
      textColor: 'text-purple-700',
    },
    {
      label: 'Network I/O',
      value: '245 Mbps',
      icon: <Network className="w-5 h-5" />,
      color: 'bg-green-100',
      textColor: 'text-green-700',
    },
  ]

  useEffect(() => {
    checkGrafanaHealth()
  }, [])

  const checkGrafanaHealth = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/v1/grafana/health')
      setGrafanaHealth(response.data)
    } catch (error) {
      console.error('Error checking Grafana health:', error)
      setGrafanaHealth({
        connected: false,
        status: 'error',
        message: 'Failed to check Grafana status',
        url: null
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Monitor</h1>
        <p className="text-gray-600 text-sm mt-1">Real-time cluster monitoring and pod metrics</p>
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
            <BarChart3 className="w-6 h-6 text-orange-500" />
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
              <div>
                <p className="font-medium mb-1">Install KubeCent Dashboards:</p>
                <div className="bg-blue-900 text-blue-50 p-3 rounded font-mono text-xs overflow-x-auto">
                  <div>git clone https://github.com/voidVisual/KubeCent-Monitoring-dashboard.git</div>
                  <div>cd KubeCent-Monitoring-dashboard</div>
                  <div>kubectl apply -k . -n monitoring</div>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <a
                  href="/GRAFANA_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-800 underline font-medium"
                >
                  View Full Setup Documentation →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={grafanaHealth?.url ? `${grafanaHealth.url}/d/cluster-overview` : '#'}
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
              <h3 className="font-semibold text-gray-900 mb-1">Cluster Overview</h3>
              <p className="text-xs text-gray-600">Overall cluster health and resources</p>
            </div>
            <ExternalLink className={`w-4 h-4 ${grafanaHealth?.connected ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
          </a>
          <a
            href={grafanaHealth?.url ? `${grafanaHealth.url}/d/pod-metrics` : '#'}
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
              <h3 className="font-semibold text-gray-900 mb-1">Pod Metrics</h3>
              <p className="text-xs text-gray-600">CPU, memory, and network metrics</p>
            </div>
            <ExternalLink className={`w-4 h-4 ${grafanaHealth?.connected ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
          </a>
          <a
            href={grafanaHealth?.url ? `${grafanaHealth.url}/d/cost-analysis` : '#'}
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
              <h3 className="font-semibold text-gray-900 mb-1">Cost Analysis</h3>
              <p className="text-xs text-gray-600">Resource cost breakdown and trends</p>
            </div>
            <ExternalLink className={`w-4 h-4 ${grafanaHealth?.connected ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
          </a>
          <a
            href={grafanaHealth?.url ? `${grafanaHealth.url}/d/node-performance` : '#'}
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
              <h3 className="font-semibold text-gray-900 mb-1">Node Performance</h3>
              <p className="text-xs text-gray-600">Node-level resource utilization</p>
            </div>
            <ExternalLink className={`w-4 h-4 ${grafanaHealth?.connected ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
          </a>
        </div>
      </div>

      {/* Metrics Overview */}
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

      {/* Monitoring Section */}
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  POD NAME
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  NAMESPACE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  STATUS
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  CPU
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  MEMORY
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  AGE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  RESTARTS
                </th>
              </tr>
            </thead>
            <tbody>
              {pods.map((pod, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900 font-medium">{pod.name}</td>
                  <td className="py-3 px-4 text-gray-700">{pod.namespace}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      {pod.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{pod.cpu}</td>
                  <td className="py-3 px-4 text-gray-700">{pod.memory}</td>
                  <td className="py-3 px-4 text-gray-700">{pod.age}</td>
                  <td className="py-3 px-4 text-gray-700">{pod.restarts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Node Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'node-1', status: 'Ready', cpu: '65%', memory: '72%' },
            { name: 'node-2', status: 'Ready', cpu: '48%', memory: '56%' },
            { name: 'node-3', status: 'Ready', cpu: '52%', memory: '61%' },
          ].map((node, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{node.name}</h3>
                <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  {node.status}
                </span>
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
      </div>
    </div>
  )
}
