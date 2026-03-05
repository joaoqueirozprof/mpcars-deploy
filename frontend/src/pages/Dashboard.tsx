import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../services/api'
import { Car, Users, FileText, DollarSign, AlertCircle, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardData {
  veiculos: {
    total: number
    disponíveis: number
    alugados: number
    manutenção: number
  }
  clientes: {
    total: number
  }
  contratos: {
    ativos: number
    total: number
  }
  financeiro: {
    receita_mes_atual: number
    despesas_mes_atual: number
    lucro_mes_atual: number
  }
  atividades_recentes: Array<{
    id: string | number
    tipo: string
    cliente_id: string | number
    veiculo_id: string | number
    status: string
    data: string
  }>
  alertas: Array<{
    tipo: string
    quantidade: number
    mensagem: string
    severity: 'info' | 'warning' | 'high'
  }>
  timestamp: string
}

interface StatCard {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

const Dashboard: React.FC = () => {
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardAPI.stats()
      return response.data as DashboardData
    },
    staleTime: 5 * 60 * 1000,
  })

  const statsData = statsResponse as DashboardData | undefined

  const stats: StatCard[] = [
    {
      label: 'Total de Veículos',
      value: statsData?.veiculos.total || 0,
      icon: <Car size={24} className="text-primary" />,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Contratos Ativos',
      value: statsData?.contratos.ativos || 0,
      icon: <FileText size={24} className="text-success" />,
      color: 'bg-green-50 border-green-200',
    },
    {
      label: 'Total de Clientes',
      value: statsData?.clientes.total || 0,
      icon: <Users size={24} className="text-warning" />,
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      label: 'Receita do Mês',
      value: `R$ ${(statsData?.financeiro.receita_mes_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign size={24} className="text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200',
    },
  ]

  const chartData = [
    { month: 'Jan', receita: 12000, despesa: 3000 },
    { month: 'Fev', receita: 15000, despesa: 3500 },
    { month: 'Mar', receita: 18000, despesa: 4000 },
    { month: 'Abr', receita: 16000, despesa: 3200 },
    { month: 'Mai', receita: 20000, despesa: 4500 },
    { month: 'Jun', receita: statsData?.financeiro.receita_mes_atual || 0, despesa: statsData?.financeiro.despesas_mes_atual || 0 },
  ]

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle size={16} />
      case 'warning':
        return <AlertCircle size={16} />
      default:
        return <AlertCircle size={16} />
    }
  }

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bem-vindo ao sistema MPCARS</p>
        </div>
        <button className="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <TrendingUp size={20} />
          Exportar Relatório
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`border rounded-lg p-6 ${stat.color} hover:shadow-md transition-shadow`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-2 text-gray-900">{stat.value}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Receita vs Despesa</h2>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} name="Despesa" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Resumo Financeiro</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Receita do Mês</p>
              <p className="text-2xl font-bold text-success">
                R$ {(statsData?.financeiro.receita_mes_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-gray-600">Despesas do Mês</p>
              <p className="text-2xl font-bold text-danger">
                R$ {(statsData?.financeiro.despesas_mes_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="border-t pt-3 bg-blue-50 p-3 rounded">
              <p className="text-sm text-gray-600">Lucro Líquido</p>
              <p className="text-2xl font-bold text-primary">
                R$ {(statsData?.financeiro.lucro_mes_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h2>
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Carregando...</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {statsData?.atividades_recentes && statsData.atividades_recentes.length > 0 ? (
                statsData.atividades_recentes.slice(0, 5).map((atividade: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {atividade.tipo} - {atividade.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {atividade.data ? format(new Date(atividade.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data indisponível'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
              )}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas</h2>
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Carregando...</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {statsData?.alertas && statsData.alertas.length > 0 ? (
                statsData.alertas.map((alerta: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-sm ${getAlertStyles(alerta.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getAlertIcon(alerta.severity)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{alerta.tipo}</p>
                        <p className="text-xs opacity-90 mt-0.5">{alerta.mensagem}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum alerta no momento</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
