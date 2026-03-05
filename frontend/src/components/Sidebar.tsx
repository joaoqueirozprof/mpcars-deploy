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
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation()

  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/veiculos', label: 'Veículos', icon: <Car size={20} /> },
    { path: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
    { path: '/contratos', label: 'Contratos', icon: <FileText size={20} /> },
    { path: '/empresas', label: 'Empresas', icon: <Building2 size={20} /> },
    { path: '/financeiro', label: 'Financeiro', icon: <DollarSign size={20} /> },
    { path: '/seguros', label: 'Seguros', icon: <Shield size={20} /> },
    { path: '/ipva', label: 'IPVA', icon: <Paperclip size={20} /> },
    { path: '/multas', label: 'Multas', icon: <AlertTriangle size={20} /> },
    { path: '/manutencoes', label: 'Manutenções', icon: <Wrench size={20} /> },
    { path: '/reservas', label: 'Reservas', icon: <BookOpen size={20} /> },
    { path: '/relatorios', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-primary-dark text-white overflow-y-auto transition-transform duration-300 transform lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-blue-600">
          <h1 className="text-2xl font-bold tracking-wider">MPCARS</h1>
          <p className="text-blue-200 text-sm mt-1">Gestão de Locadora</p>
        </div>

        {/* Menu items */}
        <div className="py-6 space-y-2 px-4">
          {menuItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-blue-100 hover:bg-blue-700/50'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-600 bg-gradient-to-t from-primary-dark to-transparent">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default Sidebar
