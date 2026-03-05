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
import Seguros from './pages/Seguros'
import IPVA from './pages/Ipva'
import Multas from './pages/Multas'
import Manutencoes from './pages/Manutencoes'
import Reservas from './pages/Reservas'
import Relatorios from './pages/Relatorios'
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
        <Route path="/seguros" element={<Seguros />} />
        <Route path="/ipva" element={<IPVA />} />
        <Route path="/multas" element={<Multas />} />
        <Route path="/manutencoes" element={<Manutencoes />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
