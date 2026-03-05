import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { alertasAPI } from '../services/api'
import Sidebar from './Sidebar'
import { Menu, X, Bell, ChevronRight, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch alerts for notification bell
  const { data: alertasData, isLoading: alertasLoading } = useQuery({
    queryKey: ['alertas-notif'],
    queryFn: async () => {
      try {
        const response = await alertasAPI.list({ limit: 10, resolvido: false })
        return response.data
      } catch {
        return { items: [], total: 0 }
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  const alertas = alertasData?.items || []
  const totalAlertas = alertasData?.total || 0

  // Close notif dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const urgenciaConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    critical: { icon: <AlertCircle size={16} />, color: 'text-red-600', bg: 'bg-red-50' },
    error: { icon: <AlertCircle size={16} />, color: 'text-red-600', bg: 'bg-red-50' },
    warning: { icon: <AlertTriangle size={16} />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    info: { icon: <Info size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  }
  const defaultUrgencia = { icon: <Info size={16} />, color: 'text-gray-600', bg: 'bg-gray-50' }

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
        <div className="flex items-center gap-2">
          {/* Mobile notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Bell size={20} className="text-neutral-600" />
              {totalAlertas > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {totalAlertas > 99 ? '99+' : totalAlertas}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
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
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <Bell size={20} className="text-neutral-600" />
                {totalAlertas > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {totalAlertas > 99 ? '99+' : totalAlertas}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
                    <span className="text-xs text-gray-500">
                      {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} ativo{totalAlertas !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {alertasLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-primary" />
                        <span className="ml-2 text-sm text-gray-500">Carregando...</span>
                      </div>
                    ) : alertas.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <Bell size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma notificação</p>
                      </div>
                    ) : (
                      alertas.map((alerta: any) => {
                        const config = urgenciaConfig[alerta.urgencia] || defaultUrgencia
                        return (
                          <div
                            key={alerta.id}
                            className={`px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer ${config.bg}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 ${config.color}`}>
                                {config.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {alerta.titulo}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {alerta.descricao}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {alerta.data_criacao
                                    ? new Date(alerta.data_criacao).toLocaleDateString('pt-BR')
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
                    <button
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('/alertas')
                      }}
                      className="w-full text-center text-sm text-primary hover:text-primary-dark font-medium py-1 transition-colors"
                    >
                      Ver todos os alertas
                    </button>
                  </div>
                </div>
              )}
            </div>

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
