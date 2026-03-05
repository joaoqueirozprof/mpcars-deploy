import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  Building2,
  DollarSign,
  Shield,
  Paperclip,
  AlertTriangle,
  Wrench,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation()
  const { user } = useAuth()

  const menuSections: MenuSection[] = [
    {
      title: 'Principal',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/veiculos', label: 'Veículos', icon: <Car size={20} /> },
        { path: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
        { path: '/contratos', label: 'Contratos', icon: <FileText size={20} /> },
      ],
    },
    {
      title: 'Gestão',
      items: [
        { path: '/empresas', label: 'Empresas', icon: <Building2 size={20} /> },
        { path: '/financeiro', label: 'Financeiro', icon: <DollarSign size={20} /> },
      ],
    },
    {
      title: 'Operacional',
      items: [
        { path: '/seguros', label: 'Seguros', icon: <Shield size={20} /> },
        { path: '/ipva', label: 'IPVA', icon: <Paperclip size={20} /> },
        { path: '/multas', label: 'Multas', icon: <AlertTriangle size={20} /> },
        { path: '/manutencoes', label: 'Manutenções', icon: <Wrench size={20} /> },
      ],
    },
    {
      title: 'Outros',
      items: [
        { path: '/reservas', label: 'Reservas', icon: <BookOpen size={20} /> },
        { path: '/relatorios', label: 'Relatórios', icon: <BarChart3 size={20} /> },
        { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
      ],
    },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  const sidebarWidth = isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed lg:static inset-y-0 left-0 z-20 ${sidebarWidth} bg-white border-r border-neutral-200 overflow-y-auto transition-all duration-300 transform lg:transform-none flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo section */}
        <div className="relative p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent flex items-center gap-2">
                  <Car size={24} />
                  MPCARS
                </h1>
                <p className="text-neutral-500 text-xs mt-1">Gestão de Locadora</p>
              </div>
            )}
            {isCollapsed && (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                <Car size={20} />
              </div>
            )}
          </div>

          {/* Collapse button - desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white border border-neutral-200 rounded-full items-center justify-center hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <ChevronLeft size={16} className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Menu sections */}
        <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      title={isCollapsed ? item.label : ''}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group ${
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      {/* Left border indicator for active item */}
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-600 rounded-r-full" />
                      )}

                      <span className={`flex-shrink-0 ${active ? 'text-primary-600' : 'text-neutral-500'}`}>
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <>
                          <span className={`font-medium text-sm flex-1 ${active ? 'text-primary-700' : 'text-neutral-700'}`}>
                            {item.label}
                          </span>
                          {active && (
                            <div className="w-2 h-2 rounded-full bg-primary-600" />
                          )}
                        </>
                      )}

                      {/* Tooltip on hover for collapsed state */}
                      {isCollapsed && (
                        <div className="hidden group-hover:flex absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User section and logout - sticky at bottom */}
        <div className="border-t border-neutral-200 p-3 space-y-3">
          {/* User avatar and info */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user?.role || 'Admin'}
                </p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={onLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-danger-50 hover:bg-danger-100 text-danger-700 font-medium transition-colors duration-200 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </nav>
    </>
  )
}

export default Sidebar
