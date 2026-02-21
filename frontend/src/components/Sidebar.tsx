import {
  Activity,
  Server,
  Zap,
  Eye,
  BarChart2,
  AlertCircle,
  Heart,
  Shield,
  Settings,
} from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Eye },
    { id: 'monitor', label: 'Monitor', icon: Activity },
    { id: 'logs', label: 'Logs', icon: Server },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'savings', label: 'Savings', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'govern', label: 'Govern', icon: Shield },

  ]

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="text-white font-semibold text-lg">KubeCent</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Menu */}
      <div className="border-t border-gray-700 p-4 space-y-2">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
            currentPage === 'settings'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
