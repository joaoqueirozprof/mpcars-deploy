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
  Loader2,
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
  const [isExporting, setIsExporting] = useState(false)

  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.stats()
        const data = response.data
        // Normalize alertas_ativos keys (backend uses critical/high/warning, frontend uses critico/atencao/info)
        if (data?.alertas_ativos) {
          const a = data.alertas_ativos
          data.alertas_ativos = {
            critico: a.critico ?? a.critical ?? a.high ?? 0,
            atencao: a.atencao ?? a.warning ?? 0,
            info: a.info ?? 0,
          }
        }
        // Normalize taxa_ocupacao (backend may return 0-100, frontend expects 0-1)
        if (data?.taxa_ocupacao !== undefined && data.taxa_ocupacao > 1) {
          data.taxa_ocupacao = data.taxa_ocupacao / 100
        }
        // Normalize contratos_atrasados (backend returns cliente_id/veiculo_id, frontend expects cliente/veiculo)
        if (data?.contratos_atrasados) {
          data.contratos_atrasados = data.contratos_atrasados.map((c: any) => ({
            ...c,
            cliente: c.cliente || c.cliente_id || 'N/A',
            veiculo: c.veiculo || c.veiculo_id || 'N/A',
          }))
        }
        return data as DashboardStats
      } catch (err) {
        console.error('Dashboard stats error:', err)
        // Return safe defaults instead of throwing
        return {
          total_veiculos: 0,
          veiculos_alugados: 0,
          veiculos_disponiveis: 0,
          veiculos_manutencao: 0,
          contratos_ativos: 0,
          total_clientes: 0,
          receita_mes: 0,
          despesas_mes: 0,
          lucro_mes: 0,
          taxa_ocupacao: 0,
          top_clientes: [],
          top_veiculos: [],
          historico_mensal: [],
          alertas_ativos: { critico: 0, atencao: 0, info: 0 },
          contratos_atrasados: [],
          previsao_receita: 0,
        } as DashboardStats
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const formatCurrency = (value: number) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const handleExportReport = () => {
    if (!statsData) return
    setIsExporting(true)
    try {
      const now = new Date()
      const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>MPCARS - Dashboard</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }
  .header-bar { background: #2563eb; color: white; padding: 20px 30px; border-radius: 8px; margin-bottom: 30px; }
  .header-bar h1 { margin: 0; font-size: 28px; }
  .header-bar p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
  h2 { color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 30px; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
  tr:hover { background: #f9fafb; }
  .section td { background: #2563eb; color: white; font-weight: 600; font-size: 14px; text-transform: uppercase; }
  .value { text-align: right; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
  @media print { body { margin: 20px; } .no-print { display: none; } }
</style></head><body>
  <div class="header-bar"><h1>MPCARS - Resumo do Dashboard</h1><p>Relatório exportado em ${dateStr}</p></div>
  <h2>Resumo Geral</h2>
  <table>
    <tr><td>Total de Veículos</td><td class="value">${statsData.total_veiculos || 0}</td></tr>
    <tr><td>Veículos Alugados</td><td class="value">${statsData.veiculos_alugados || 0}</td></tr>
    <tr><td>Veículos Disponíveis</td><td class="value">${statsData.veiculos_disponiveis || 0}</td></tr>
    <tr><td>Veículos em Manutenção</td><td class="value">${statsData.veiculos_manutencao || 0}</td></tr>
    <tr><td>Contratos Ativos</td><td class="value">${statsData.contratos_ativos || 0}</td></tr>
    <tr><td>Total de Clientes</td><td class="value">${statsData.total_clientes || 0}</td></tr>
    <tr><td>Taxa de Ocupação</td><td class="value">${((statsData.taxa_ocupacao || 0) * 100).toFixed(1)}%</td></tr>
  </table>
  <h2>Financeiro do Mês</h2>
  <table>
    <tr><td>Receita do Mês</td><td class="value">${formatCurrency(statsData.receita_mes || 0)}</td></tr>
    <tr><td>Despesas do Mês</td><td class="value">${formatCurrency(statsData.despesas_mes || 0)}</td></tr>
    <tr><td>Lucro Líquido</td><td class="value">${formatCurrency(statsData.lucro_mes || 0)}</td></tr>
    <tr><td>Previsão de Receita (30 dias)</td><td class="value">${formatCurrency(statsData.previsao_receita || 0)}</td></tr>
  </table>
  <h2>Alertas Ativos</h2>
  <table>
    <tr><td>Críticos</td><td class="value">${statsData.alertas_ativos?.critico || 0}</td></tr>
    <tr><td>Atenção</td><td class="value">${statsData.alertas_ativos?.atencao || 0}</td></tr>
    <tr><td>Informação</td><td class="value">${statsData.alertas_ativos?.info || 0}</td></tr>
  </table>
  ${statsData.contratos_atrasados && statsData.contratos_atrasados.length > 0 ? `
  <h2>Contratos Atrasados</h2>
  <table>
    <tr class="section"><td>Cliente</td><td>Veículo</td><td>Dias Atraso</td></tr>
    ${statsData.contratos_atrasados.map((c: any) => `<tr><td>${c.cliente || 'N/A'}</td><td>${c.veiculo || 'N/A'}</td><td class="value">${c.dias_atraso || 0}d</td></tr>`).join('')}
  </table>` : ''}
  <div class="footer"><p>Relatório gerado em ${dateStr} | MPCARS - Sistema de Gestão</p></div>
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 30px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;">Imprimir / Salvar como PDF</button>
  </div>
</body></html>`
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('Erro ao exportar relatório.')
    } finally {
      setIsExporting(false)
    }
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
        <button
          onClick={handleExportReport}
          disabled={isExporting || !statsData}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <TrendingUp size={20} />
              Exportar Relatório
            </>
          )}
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
                        Previsto: {contrato.data_prevista ? format(new Date(contrato.data_prevista), 'dd/MM/yyyy', {
                          locale: ptBR,
                        }) : '-'}
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
