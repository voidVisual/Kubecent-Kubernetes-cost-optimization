import React, { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { CostDashboard } from './pages/CostDashboard'
import { Monitor } from './pages/Monitor'
import { Logs } from './pages/Logs'
import { Reports } from './pages/Reports'
import { Alerts } from './pages/Alerts'
import { Health } from './pages/Health'
import { Govern } from './pages/Govern'
import { Savings } from './pages/Savings'
import { SettingsPage } from './pages/Settings'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'cost-dashboard':
        return <CostDashboard />
      case 'monitor':
        return <Monitor />
      case 'logs':
        return <Logs />
      case 'reports':
        return <Reports />
      case 'savings':
        return <Savings />
      case 'alerts':
        return <Alerts />
      case 'health':
        return <Health />
      case 'govern':
        return <Govern />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="ml-64 px-8 py-6">
        {renderPage()}
      </main>
    </div>
  )
}

export default App

