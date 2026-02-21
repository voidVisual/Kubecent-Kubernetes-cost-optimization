import { useState } from 'react'
import { Download, Calendar, Filter, BarChart3, TrendingUp, PieChart, CheckCircle, RefreshCw } from 'lucide-react'

export function Reports() {
  const [selectedReport, setSelectedReport] = useState('cost-summary')
  const [dateRange, setDateRange] = useState('monthly')
  const [selectedNamespace, setSelectedNamespace] = useState('all')
  const [reportFormat, setReportFormat] = useState('pdf')
  const [generatedReports, setGeneratedReports] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const reportTypes = [
    {
      id: 'cost-summary',
      name: 'Cost Summary',
      description: 'Overview of all costs across namespaces and workloads',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'efficiency',
      name: 'Efficiency Report',
      description: 'Resource utilization and efficiency metrics',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'allocation',
      name: 'Cost Allocation',
      description: 'Detailed cost breakdown by namespace, pod, and controller',
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      id: 'savings',
      name: 'Savings Potential',
      description: 'Optimization recommendations and savings opportunities',
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ]

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    
    // Simulate report generation
    setTimeout(() => {
      const newReport = {
        name: `${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} - ${dateRange}`,
        type: reportTypes.find(r => r.id === selectedReport)?.name || 'Report',
        date: new Date().toISOString().split('T')[0],
        size: Math.random() > 0.5 ? '2.4 MB' : '1.8 MB',
        status: 'Ready',
        format: reportFormat,
      }
      
      setGeneratedReports([newReport, ...generatedReports])
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 text-sm mt-1">Generate and manage cost and efficiency reports</p>
      </div>

      {/* Generate New Report */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Generate New Report</h2>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedReport === report.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`${
                    selectedReport === report.id ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {report.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{report.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{report.description}</p>
            </button>
          ))}
        </div>

        {/* Report Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Date Range
            </label>
            <div className="space-y-2">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'custom', label: 'Custom Range' }
              ].map(option => (
                <label 
                  key={option.value}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    dateRange === option.value
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dateRange"
                    value={option.value}
                    checked={dateRange === option.value}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className={`text-sm font-medium ${dateRange === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                  {dateRange === option.value && (
                    <CheckCircle className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Namespaces */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-600" />
              Namespaces
            </label>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Namespaces' },
                { value: 'production', label: 'Production' },
                { value: 'staging', label: 'Staging' },
                { value: 'default', label: 'Default' }
              ].map(option => (
                <label key={option.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedNamespace === option.value
                    ? 'bg-green-50 border-green-500'
                    : 'border-gray-200 hover:bg-green-50 hover:border-green-300'
                }`}>
                  <input
                    type="radio"
                    name="namespace"
                    value={option.value}
                    checked={selectedNamespace === option.value}
                    onChange={(e) => setSelectedNamespace(e.target.value)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className={`text-sm font-medium ${selectedNamespace === option.value ? 'text-green-700' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                  {selectedNamespace === option.value && (
                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Export Format
            </label>
            <div className="space-y-2">
              {[
                { value: 'pdf', label: 'PDF', icon: '📄' },
                { value: 'csv', label: 'CSV', icon: '📊' },
                { value: 'json', label: 'JSON', icon: '{ }' },
                { value: 'excel', label: 'Excel', icon: '📈' }
              ].map(option => (
                <label key={option.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  reportFormat === option.value
                    ? 'bg-purple-50 border-purple-500'
                    : 'border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={reportFormat === option.value}
                    onChange={(e) => setReportFormat(e.target.value)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span className="text-lg">{option.icon}</span>
                  <span className={`text-sm font-medium ${reportFormat === option.value ? 'text-purple-700' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                  {reportFormat === option.value && (
                    <CheckCircle className="w-4 h-4 ml-auto text-purple-600" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Report Type: </span>
              <span className="font-semibold text-gray-900">{reportTypes.find(r => r.id === selectedReport)?.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Period: </span>
              <span className="font-semibold text-gray-900">{dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</span>
            </div>
            <div>
              <span className="text-gray-600">Namespace: </span>
              <span className="font-semibold text-gray-900">{selectedNamespace === 'all' ? 'All Namespaces' : selectedNamespace}</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generated Reports</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  REPORT NAME
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  TYPE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  DATE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  SIZE
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  STATUS
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {generatedReports.length > 0 ? (
                generatedReports.map((report, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-4 text-gray-900 font-semibold">{report.name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                        {report.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{report.date}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{report.size}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 hover:underline transition-colors">
                        <Download size={18} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-gray-500">
                    <p className="text-sm">No reports generated yet. Create your first report above!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
