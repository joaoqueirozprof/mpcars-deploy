import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import { Menu, X, Bell, ChevronRight } from 'lucide-react'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Get breadcrumb from current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean)
    return paths.map((path, index) => ({
      label: path.charAt(0).toUpperCase() + path.slice(1),
      href: '/' + paths.slice(0, index + 1).join('/'),
    }))
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 flex items-center justify-between px-4 py-3 z-30">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
          MPCARS
        </h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <div className="hidden lg:flex h-header-height bg-white border-b border-neutral-200 items-center justify-between px-6 gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">Dashboard</span>
            {breadcrumbs.length > 0 && (
              <>
                <ChevronRight size={16} />
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <ChevronRight size={16} />}
                    <button
                      onClick={() => navigate(crumb.href)}
                      className="hover:text-primary-600 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>

          {/* Right side - notifications and user */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors">
              <Bell size={20} className="text-neutral-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-neutral-500">
                  {user?.role || 'Administrator'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
