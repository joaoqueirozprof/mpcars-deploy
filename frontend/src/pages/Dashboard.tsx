import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../services/api'
import { TrendingUp, Users, Car, FileText, DollarSign } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Stat {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

interface Alert {
  id: string
  type: string
  message: string
  date: string
}

const Dashboard: React.FC = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.stats(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => dashboardAPI.charts(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardAPI.alerts(),
    staleTime: 2 * 60 * 1000,
  })

  const stats: Stat[] = [
    {
      label: 'Veículos Disponíveis',
      value: statsData?.data?.availableVehicles || 0,
      icon: <Car size={24} />,
      color: 'bg-green-50 border-green-200 text-success',
    },
    {
      label: 'Veículos Alugados',
      value: statsData?.data?.rentedVehicles || 0,
      icon: <Car size={24} />,
      color: 'bg-blue-50 border-blue-200 text-primary',
    },
    {
      label: 'Clientes Ativos',
      value: statsData?.data?.activeClients || 0,
      icon: <Users size={24} />,
      color: 'bg-purple-50 border-purple-200 text-purple-600',
    },
    {
      label: 'Contratos Ativos',
      value: statsData?.data?.activeContracts || 0,
      icon: <FileText size={24} />,
      color: 'bg-yellow-50 border-yellow-200 text-warning',
    },
    {
      label: 'Receita do Mês',
      value: `R$ ${(statsData?.data?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign size={24} />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    },
  ]

  const chartData = chartsData?.data?.rentals || [
    { month: 'Jan', rentals: 0, revenue: 0 },
    { month: 'Fev', rentals: 0, revenue: 0 },
    { month: 'Mar', rentals: 0, revenue: 0 },
    { month: 'Abr', rentals: 0, revenue: 0 },
    { month: 'Mai', rentals: 0, revenue: 0 },
    { month: 'Jun', rentals: 0, revenue: 0 },
  ]

  const alerts: Alert[] = alertsData?.data || [
    { id: '1', type: 'warning', message: 'CNH do cliente João vence em 3 dias', date: '2024-01-15' },
    { id: '2', type: 'info', message: 'Veículo ABC-1234 com manutenção agendada', date: '2024-01-14' },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bem-vindo ao MPCARS</p>
        </div>
        <button className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
          <TrendingUp className="inline mr-2" size={20} />
          Exportar Relatório
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`border rounded-lg p-6 ${stat.color}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className="p-3 bg-white rounded-lg opacity-70">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rentals Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aluguéis por Mês</h2>
          {chartsLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rentals" stroke="#0066ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Receita por Mês</h2>
          {chartsLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#0066ff" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alerts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h2>
          {chartsLoading ? (
            <div className="text-center text-gray-500 py-8">Carregando...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Contrato #001234 finalizado</p>
                  <p className="text-xs text-gray-500">há 2 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo cliente registrado: Maria Silva</p>
                  <p className="text-xs text-gray-500">há 4 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Veículo XYZ-9876 retornou de manutenção</p>
                  <p className="text-xs text-gray-500">há 1 dia</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo contrato criado</p>
                  <p className="text-xs text-gray-500">há 1 dia</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas</h2>
          {alertsLoading ? (
            <div className="text-center text-gray-500 py-8">Carregando...</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg text-sm ${
                    alert.type === 'warning'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-xs opacity-75 mt-1">{alert.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
