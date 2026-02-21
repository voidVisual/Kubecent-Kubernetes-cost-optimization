import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Zap,
  Trash2,
  Activity,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  estimated_savings: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  affected_resources: string[];
  action: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  rightsizing: <Gauge className="w-5 h-5" />,
  idle: <Trash2 className="w-5 h-5" />,
  consolidation: <Activity className="w-5 h-5" />,
  scaling: <Zap className="w-5 h-5" />,
};

export function Savings() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [savingsData, setSavingsData] = useState<any>(null);
  const [implementedItems, setImplementedItems] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSavingsData();
  }, []);

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/savings');
      setSavingsData(response.data);
    } catch (error) {
      console.error('Error fetching savings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSavingsData();
    setRefreshing(false);
  };

  const handleImplement = (id: string) => {
    setImplementedItems(prev => new Set([...prev, id]));
  };

  const handleDismiss = (id: string) => {
    // In a real app, would make API call to dismiss
    setSavingsData((prev: any) => ({
      ...prev,
      recommendations: prev.recommendations.filter((r: any) => r.id !== id)
    }));
  };

  const recommendations: Recommendation[] = savingsData?.recommendations?.map(
    (rec: any) => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      category: rec.type,
      estimated_savings: rec.savings,
      priority: rec.severity,
      affected_resources: [rec.resourceName],
      action: rec.action,
    })
  ) || [];

  const activeRecommendations = recommendations.filter(rec => !implementedItems.has(rec.id));
  
  const filteredRecommendations = activeRecommendations.filter((rec) => {
    const categoryMatch = selectedCategory === 'all' || rec.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const totalSavings = savingsData?.totalPotentialSavings || 0;
  const monthlySavings = (totalSavings / 12).toFixed(2);
  const implementedCount = implementedItems.size;
  const activeCount = recommendations.length - implementedCount;

  const categories = ['all', 'rightsizing', 'termination', 'scheduling', 'storage'];
  const priorities = ['all', 'high', 'medium', 'low'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Savings Opportunities</h1>
          <p className="text-gray-600">Identified cost optimization recommendations</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-6 border border-green-200 shadow-sm">
          <h3 className="text-sm font-medium text-green-700 mb-2">Annual Savings Potential</h3>
          <p className="text-3xl font-bold text-green-900">${totalSavings.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-2">${monthlySavings}/month</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Recommendations</h3>
          <p className="text-3xl font-bold text-gray-900">{recommendations.length}</p>
          <p className="text-xs text-gray-500 mt-2">{recommendations.filter((r) => r.priority === 'high').length} high priority</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Implemented</h3>
          <p className="text-3xl font-bold text-gray-900">{implementedCount}</p>
          <p className="text-xs text-gray-500 mt-2">
            {recommendations.length > 0 ? ((implementedCount / recommendations.length) * 100).toFixed(0) : '0'}% complete
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active</h3>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-2">Awaiting action</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                    selectedCategory === cat
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Priority</h3>
            <div className="flex flex-wrap gap-2">
              {priorities.map((prio) => (
                <button
                  key={prio}
                  onClick={() => setSelectedPriority(prio)}
                  className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                    selectedPriority === prio
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {prio.charAt(0).toUpperCase() + prio.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-600 py-8">Loading recommendations...</div>
        ) : filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-lg p-6 border-l-4 bg-white border border-gray-200 shadow-sm ${
                rec.priority === 'high' ? 'border-l-red-500' : rec.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-gray-600">{categoryIcons[rec.category]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{rec.title}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' : 
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      {implementedItems.has(rec.id) && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                          IMPLEMENTED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{rec.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rec.affected_resources.slice(0, 3).map((resource, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-700"
                        >
                          {resource}
                        </span>
                      ))}
                      {rec.affected_resources.length > 3 && (
                        <span className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-500">
                          +{rec.affected_resources.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-bold text-xl">${rec.estimated_savings.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">annual savings</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition font-medium text-sm">
                  Learn More
                </button>
                <button 
                  onClick={() => handleImplement(rec.id)}
                  disabled={implementedItems.has(rec.id)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {implementedItems.has(rec.id) ? 'Implemented' : 'Implement'}
                </button>
                <button 
                  onClick={() => handleDismiss(rec.id)}
                  className="ml-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-600 bg-white rounded-lg shadow-sm border border-gray-200">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No recommendations match your filters</p>
          </div>
        )}
      </div>

      {/* Implementation Guide */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Implementation Guide</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-900 text-white">
                1
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Review Recommendations</h3>
              <p className="text-sm text-gray-600">
                Start with high-priority recommendations for maximum impact
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-900 text-white">
                2
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Test in Development</h3>
              <p className="text-sm text-gray-600">
                Validate changes in a non-production environment first
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-900 text-white">
                3
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Track Results</h3>
              <p className="text-sm text-gray-600">
                Monitor cost changes after implementing recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
