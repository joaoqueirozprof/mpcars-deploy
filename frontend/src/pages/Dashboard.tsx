import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../services/api'
import {
  Car,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  total_veiculos: number
  veiculos_alugados: number
  veiculos_disponiveis: number
  veiculos_manutencao: number
  contratos_ativos: number
  total_clientes: number
  receita_mes: number
  despesas_mes: number
  lucro_mes: number
  taxa_ocupacao: number
  top_clientes: Array<{
    nome: string
    total: number
  }>
  top_veiculos: Array<{
    placa: string
    marca: string
    modelo: string
    total_contratos: number
  }>
  historico_mensal: Array<{
    mes: string
    receita: number
    despesa: number
  }>
  alertas_ativos: {
    critico: number
    atencao: number
    info: number
  }
  contratos_atrasados: Array<{
    id: number
    cliente: string
    veiculo: string
    data_prevista: string
    dias_atraso: number
  }>
  previsao_receita: number
}

const Dashboard: React.FC = () => {
  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardAPI.stats()
      return response.data as DashboardStats
    },
    staleTime: 5 * 60 * 1000,
  })

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  // Top 4 metric cards
  const metricCards = [
    {
      label: 'Total de Veículos',
      value: statsData?.total_veiculos || 0,
      icon: <Car size={24} />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Veículos Alugados',
      value: statsData?.veiculos_alugados || 0,
      icon: <TrendingUp size={24} />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Contratos Ativos',
      value: statsData?.contratos_ativos || 0,
      icon: <FileText size={24} />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'Receita do Mês',
      value: formatCurrency(statsData?.receita_mes || 0),
      icon: <DollarSign size={24} />,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
  ]

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Clock size={32} className="text-blue-600" />
          </div>
          <p className="text-gray-600 mt-4">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-600 mx-auto" />
          <p className="text-gray-600 mt-4">Erro ao carregar dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Bem-vindo ao sistema MPCARS</p>
        </div>
        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <TrendingUp size={20} />
          Exportar Relatório
        </button>
      </div>

      {/* Metric Cards - Top 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} border ${card.borderColor} rounded-lg p-6 hover:shadow-lg transition-shadow duration-200`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-3 text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.textColor} p-3 bg-white rounded-lg`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Rate Bar */}
      {statsData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Taxa de Ocupação</h3>
            <span className="text-2xl font-bold text-blue-600">
              {(statsData.taxa_ocupacao * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(statsData.taxa_ocupacao * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {statsData.veiculos_alugados} de {statsData.total_veiculos} veículos alugados
          </p>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receita */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600 font-medium">Receita do Mês</p>
            <DollarSign className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(statsData?.receita_mes || 0)}
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600 font-medium">Despesas do Mês</p>
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(statsData?.despesas_mes || 0)}
          </p>
        </div>

        {/* Lucro */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600 font-medium">Lucro Líquido</p>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <p
            className={`text-3xl font-bold ${
              (statsData?.lucro_mes || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(statsData?.lucro_mes || 0)}
          </p>
        </div>
      </div>

      {/* Revenue vs Expenses Chart with Real Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Histórico de Receita vs Despesa
        </h2>
        {statsData?.historico_mensal && statsData.historico_mensal.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statsData.historico_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="receita"
                stroke="#10b981"
                strokeWidth={2}
                name="Receita"
                dot={{ fill: '#10b981', r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="despesa"
                stroke="#ef4444"
                strokeWidth={2}
                name="Despesa"
                dot={{ fill: '#ef4444', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Sem dados disponíveis
          </div>
        )}
      </div>

      {/* Top Clientes and Top Veículos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clientes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nome
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Total Gasto
                  </th>
                </tr>
              </thead>
              <tbody>
                {statsData?.top_clientes && statsData.top_clientes.length > 0 ? (
                  statsData.top_clientes.slice(0, 5).map((cliente, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {cliente.nome}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">
                        {formatCurrency(cliente.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-gray-500">
                      Sem dados de clientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Veículos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Veículos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Placa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Modelo
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Contratos
                  </th>
                </tr>
              </thead>
              <tbody>
                {statsData?.top_veiculos && statsData.top_veiculos.length > 0 ? (
                  statsData.top_veiculos.slice(0, 5).map((veiculo, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-semibold">
                        {veiculo.placa}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {veiculo.marca} {veiculo.modelo}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {veiculo.total_contratos}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      Sem dados de veículos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active Alerts and Contratos Atrasados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Ativos</h2>
          <div className="space-y-3">
            {statsData?.alertas_ativos ? (
              <>
                {/* Critical Alerts */}
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white rounded-full p-2">
                      <AlertCircle size={16} />
                    </div>
                    <span className="font-medium text-gray-900">Crítico</span>
                  </div>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full font-semibold text-sm">
                    {statsData.alertas_ativos.critico}
                  </span>
                </div>

                {/* Attention Alerts */}
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-600 text-white rounded-full p-2">
                      <AlertTriangle size={16} />
                    </div>
                    <span className="font-medium text-gray-900">Atenção</span>
                  </div>
                  <span className="bg-yellow-600 text-white px-3 py-1 rounded-full font-semibold text-sm">
                    {statsData.alertas_ativos.atencao}
                  </span>
                </div>

                {/* Info Alerts */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white rounded-full p-2">
                      <Info size={16} />
                    </div>
                    <span className="font-medium text-gray-900">Informação</span>
                  </div>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-semibold text-sm">
                    {statsData.alertas_ativos.info}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem alertas no momento</p>
            )}
          </div>
        </div>

        {/* Contratos Atrasados */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contratos Atrasados</h2>
          {statsData?.contratos_atrasados && statsData.contratos_atrasados.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {statsData.contratos_atrasados.map((contrato, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-red-200 bg-red-50 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{contrato.cliente}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Veículo: {contrato.veiculo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Previsto: {format(new Date(contrato.data_prevista), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                      {contrato.dias_atraso}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum contrato atrasado</p>
          )}
        </div>
      </div>

      {/* Previsão de Receita */}
      {statsData && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm font-medium">Previsão de Receita</p>
              <p className="text-4xl font-bold mt-2">
                {formatCurrency(statsData.previsao_receita)}
              </p>
              <p className="text-blue-100 mt-2">Próximos 30 dias</p>
            </div>
            <TrendingUp size={48} className="opacity-80" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
