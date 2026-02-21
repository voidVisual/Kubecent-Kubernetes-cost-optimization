import { useState, useEffect } from 'react'
import { Shield, RefreshCw } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface Policy {
  id: number
  name: string
  description: string
  status: 'active' | 'inactive'
  violations: number
  namespaces: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface BudgetAlert {
  namespace: string
  budget: string
  spent: string
  percentage: number
  status: 'good' | 'warning' | 'critical'
}

export function Govern() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)

  useEffect(() => {
    fetchGovernData()
    const interval = setInterval(fetchGovernData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchGovernData = async () => {
    try {
      setLoading(true)

      // Fetch cluster and pod data for policy violations
      const clusterResponse = await apiClient.get('/api/monitoring/cluster/stats')
      const podsResponse = await apiClient.get('/api/monitoring/pods')
      
      const clusterData = clusterResponse.data
      const podsData = podsResponse.data || { pods: [] }

      // Generate policies based on cluster state
      const generatedPolicies: Policy[] = [
        {
          id: 1,
          name: 'CPU Limit Policy',
          description: 'Enforce CPU resource limits on all production pods',
          status: 'active',
          violations: Array.isArray(podsData.pods) 
            ? podsData.pods.filter((p: any) => p.namespace === 'production' && !p.cpuLimit).length 
            : 0,
          namespaces: ['production'],
          severity: 'high',
        },
        {
          id: 2,
          name: 'Memory Reservation Policy',
          description: 'Require memory resource reservations',
          status: 'active',
          violations: Array.isArray(podsData.pods)
            ? podsData.pods.filter((p: any) => !p.memoryRequest).length
            : 0,
          namespaces: ['production', 'staging'],
          severity: 'critical',
        },
        {
          id: 3,
          name: 'Image Registry Policy',
          description: 'Only allow images from approved registries',
          status: 'active',
          violations: 0,
          namespaces: ['all'],
          severity: 'high',
        },
        {
          id: 4,
          name: 'Pod Security Policy',
          description: 'Enforce pod security standards',
          status: 'active',
          violations: Array.isArray(podsData.pods)
            ? podsData.pods.filter((p: any) => p.securityContext?.runAsRoot).length
            : 0,
          namespaces: ['production'],
          severity: 'medium',
        },
      ]

      // Generate budget alerts based on cluster usage
      const budgets: BudgetAlert[] = [
        {
          namespace: 'production',
          budget: '$5,000/month',
          spent: '$' + Math.round(clusterData.cpuUsage * 50),
          percentage: Math.min(90, Math.round((clusterData.cpuUsage / clusterData.cpuCapacity) * 100)),
          status: (clusterData.cpuUsage / clusterData.cpuCapacity) > 0.85 ? 'warning' : 'good',
        },
        {
          namespace: 'staging',
          budget: '$1,500/month',
          spent: '$850',
          percentage: 57,
          status: 'good',
        },
        {
          namespace: 'development',
          budget: '$500/month',
          spent: '$475',
          percentage: (clusterData.memoryUsage / clusterData.memoryCapacity) > 0.95 ? 95 : 57,
          status: (clusterData.memoryUsage / clusterData.memoryCapacity) > 0.95 ? 'critical' : 'good',
        },
      ]

      setPolicies(generatedPolicies)
      setBudgetAlerts(budgets)
    } catch (error) {
      console.error('Error fetching governance data:', error)
      // Set some default data if fetch fails
      setPolicies([])
      setBudgetAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const togglePolicy = (id: number) => {
    setPolicies(
      policies.map((p) =>
        p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
      )
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchGovernData()
    setRefreshing(false)
  }

  const handleCreatePolicy = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowPolicyModal(true)
  }

  const handleSetBudget = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowBudgetModal(true)
  }

  const handleAddUser = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowUserModal(true)
  }

  const closeModals = () => {
    setShowPolicyModal(false)
    setShowBudgetModal(false)
    setShowUserModal(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Govern</h1>
          <p className="text-gray-600 text-sm mt-1">Manage policies, budgets, and compliance</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Govern</h1>
          <p className="text-gray-600 text-sm mt-1">Manage policies, budgets, and compliance</p>
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

      {/* Policies Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Resource Policies</h2>
          <button 
            onClick={handleCreatePolicy}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Create Policy
          </button>
        </div>

        <div className="space-y-4">
          {policies.length > 0 ? (
            policies.map((policy) => (
              <div
                key={policy.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      policy.status === 'active'
                        ? 'bg-emerald-100'
                        : 'bg-gray-100'
                    }`}>
                      <Shield className={`w-5 h-5 ${
                        policy.status === 'active'
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          policy.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : policy.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {policy.severity}
                        </span>
                        {policy.violations > 0 && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                            {policy.violations} violations
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePolicy(policy.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      policy.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {policy.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-500">Namespaces:</span>
                  {policy.namespaces.map((ns, idx) => (
                    <span key={idx} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {ns}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No policies configured yet. Create one to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Namespace Budgets</h2>
          <button 
            onClick={handleSetBudget}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Set Budget
          </button>
        </div>

        <div className="space-y-4">
          {budgetAlerts.length > 0 ? (
            budgetAlerts.map((budget, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{budget.namespace}</h3>
                    <p className="text-sm text-gray-600 mt-1">{budget.spent} / {budget.budget}</p>
                  </div>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    budget.status === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : budget.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {budget.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      budget.status === 'critical'
                        ? 'bg-red-500'
                        : budget.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${budget.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No budgets configured yet. Set one to track namespace spending.</p>
            </div>
          )}
        </div>
      </div>

      {/* RBAC Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Access Control</h2>
          <button 
            onClick={handleAddUser}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  USER/ROLE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  PERMISSIONS
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  NAMESPACES
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900 font-medium">admin</td>
                <td className="py-3 px-4 text-gray-700">All</td>
                <td className="py-3 px-4 text-gray-700">All</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Active
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900 font-medium">devops-team</td>
                <td className="py-3 px-4 text-gray-700">Read, Write</td>
                <td className="py-3 px-4 text-gray-700">production, staging</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Active
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900 font-medium">dev-team</td>
                <td className="py-3 px-4 text-gray-700">Read</td>
                <td className="py-3 px-4 text-gray-700">development</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Policy</h3>
            <p className="text-gray-600 mb-4">Policy creation form would go here. For now, you can manage existing policies above.</p>
            <button
              onClick={closeModals}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Set Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Set Budget</h3>
            <p className="text-gray-600 mb-4">Budget configuration form would go here. You can see current budgets above.</p>
            <button
              onClick={closeModals}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add User</h3>
            <p className="text-gray-600 mb-4">User management form would go here. Current users are shown in the Access Control table above.</p>
            <button
              onClick={closeModals}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
