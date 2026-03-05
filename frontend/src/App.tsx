import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Veiculos from './pages/Veiculos'
import Contratos from './pages/Contratos'
import Empresas from './pages/Empresas'
import Financeiro from './pages/Financeiro'
import Configuracoes from './pages/Configuracoes'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/veiculos" element={<Veiculos />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/seguros" element={<div className="p-6"><h1 className="text-2xl font-bold">Seguros (Em desenvolvimento)</h1></div>} />
        <Route path="/ipva" element={<div className="p-6"><h1 className="text-2xl font-bold">IPVA (Em desenvolvimento)</h1></div>} />
        <Route path="/multas" element={<div className="p-6"><h1 className="text-2xl font-bold">Multas (Em desenvolvimento)</h1></div>} />
        <Route path="/manutencoes" element={<div className="p-6"><h1 className="text-2xl font-bold">Manutenções (Em desenvolvimento)</h1></div>} />
        <Route path="/reservas" element={<div className="p-6"><h1 className="text-2xl font-bold">Reservas (Em desenvolvimento)</h1></div>} />
        <Route path="/relatorios" element={<div className="p-6"><h1 className="text-2xl font-bold">Relatórios (Em desenvolvimento)</h1></div>} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
