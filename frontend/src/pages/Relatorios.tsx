import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relatoriosAPI } from '../services/api'
import { Download, Filter, BarChart3, FileText, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Relatorio {
  id: string
  nome: string
  tipo: 'receitas' | 'despesas' | 'veiculos' | 'clientes' | 'contratos'
  data_geracao: string
  periodo: string
  descricao: string
}

type TipoFilter = 'todos' | 'receitas' | 'despesas' | 'veiculos' | 'clientes' | 'contratos'

const Relatorios: React.FC = () => {
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [gerarTipo, setGerarTipo] = useState('financeiro')
  const [gerarAno, setGerarAno] = useState(new Date().getFullYear())
  const [gerarMes, setGerarMes] = useState(new Date().getMonth() + 1)
  const [reportResult, setReportResult] = useState<any>(null)
  const [reportResultTipo, setReportResultTipo] = useState('')

  const { data: relatoriosData, isLoading } = useQuery({
    queryKey: ['relatorios', tipoFilter, dataInicio, dataFim],
    queryFn: async () => {
      const response = await relatoriosAPI.list({
        tipo: tipoFilter === 'todos' ? undefined : tipoFilter,
        data_inicio: dataInicio,
        data_fim: dataFim,
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const relatorios: Relatorio[] = relatoriosData?.items || []

  const tiposConfig: Record<string, { label: string; color: string }> = {
    receitas: { label: 'Receitas', color: 'text-success' },
    despesas: { label: 'Despesas', color: 'text-danger' },
    veiculos: { label: 'Veículos', color: 'text-primary' },
    clientes: { label: 'Clientes', color: 'text-warning' },
    contratos: { label: 'Contratos', color: 'text-primary' },
  }
  const defaultTipo = { label: 'Outro', color: 'text-gray-600' }

  const filterTabs: { value: TipoFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'receitas', label: 'Receitas' },
    { value: 'despesas', label: 'Despesas' },
    { value: 'veiculos', label: 'Veículos' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'contratos', label: 'Contratos' },
  ]

  const formatCurrency = (value: number) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const buildReportHTML = (data: any, tipo: string): string => {
    const now = new Date()
    const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    let bodyContent = ''

    if (tipo === 'financeiro') {
      bodyContent = `
        <h2>Relatório Financeiro</h2>
        <p><strong>Período:</strong> ${data.periodo || 'N/A'}</p>
        <table>
          <tr class="header"><td colspan="2">RECEITAS</td></tr>
          <tr><td>Total de Receitas</td><td class="value">${formatCurrency(data.receitas?.total || 0)}</td></tr>
          <tr><td>Contratos Finalizados</td><td class="value">${data.receitas?.contratos_finalizados || 0}</td></tr>
          <tr><td>Valor Médio por Contrato</td><td class="value">${formatCurrency(data.receitas?.valor_medio || 0)}</td></tr>
          <tr class="header"><td colspan="2">DESPESAS</td></tr>
          <tr><td>Total de Despesas</td><td class="value">${formatCurrency(data.despesas?.total || 0)}</td></tr>
          <tr><td>Manutenção</td><td class="value">${formatCurrency(data.despesas?.manutencao || 0)}</td></tr>
          <tr><td>Multas</td><td class="value">${formatCurrency(data.despesas?.multas || 0)}</td></tr>
          <tr class="total"><td>LUCRO LÍQUIDO</td><td class="value">${formatCurrency(data.lucro_liquido || 0)}</td></tr>
        </table>
      `
    } else if (tipo === 'frota') {
      bodyContent = `
        <h2>Relatório de Frota</h2>
        <table>
          <tr><td>Total de Veículos</td><td class="value">${data.total_veiculos || 0}</td></tr>
          <tr><td>Disponíveis</td><td class="value">${data.status?.['disponíveis'] || 0}</td></tr>
          <tr><td>Alugados</td><td class="value">${data.status?.alugados || 0}</td></tr>
          <tr><td>Em Manutenção</td><td class="value">${data.status?.['manutenção'] || 0}</td></tr>
          <tr><td>Taxa de Utilização</td><td class="value">${(data.utilization_percentage || 0).toFixed(1)}%</td></tr>
          <tr><td>Contratos Ativos</td><td class="value">${data.contratos_ativos || 0}</td></tr>
          <tr><td>Quilometragem Total</td><td class="value">${(data.quilometragem_total || 0).toLocaleString('pt-BR')} km</td></tr>
          <tr><td>Quilometragem Média</td><td class="value">${(data.quilometragem_media || 0).toLocaleString('pt-BR')} km</td></tr>
        </table>
      `
    } else if (tipo === 'clientes') {
      bodyContent = `
        <h2>Relatório de Clientes</h2>
        <table>
          <tr><td>Total de Clientes Cadastrados</td><td class="value">${data.total_clientes || 0}</td></tr>
        </table>
      `
    } else if (tipo === 'contratos') {
      bodyContent = `
        <h2>Relatório de Contratos</h2>
        <table>
          <tr><td>Total de Contratos</td><td class="value">${data.total_contratos || 0}</td></tr>
          <tr><td>Ativos</td><td class="value">${data.status_breakdown?.ativos || 0}</td></tr>
          <tr><td>Finalizados</td><td class="value">${data.status_breakdown?.finalizados || 0}</td></tr>
          <tr><td>Cancelados</td><td class="value">${data.status_breakdown?.cancelados || 0}</td></tr>
        </table>
      `
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>MPCARS - Relatório</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }
    .header-bar { background: #2563eb; color: white; padding: 20px 30px; border-radius: 8px; margin-bottom: 30px; }
    .header-bar h1 { margin: 0; font-size: 28px; }
    .header-bar p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
    h2 { color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    .header td { background: #2563eb; color: white; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .total td { background: #f0f9ff; font-weight: 700; font-size: 16px; border-top: 2px solid #2563eb; }
    .value { text-align: right; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
    @media print { body { margin: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1>MPCARS</h1>
    <p>Sistema de Gestão de Locadora de Veículos</p>
  </div>
  ${bodyContent}
  <div class="footer">
    <p>Relatório gerado em ${dateStr} | MPCARS - Sistema de Gestão</p>
  </div>
  <div class="no-print" style="margin-top:20px; text-align:center;">
    <button onclick="window.print()" style="padding:10px 30px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px;">
      Imprimir / Salvar como PDF
    </button>
  </div>
</body>
</html>`
  }

  const handleGerarRelatorio = async () => {
    setIsGenerating(true)
    try {
      let response
      let tipoNome = ''

      if (gerarTipo === 'financeiro') {
        response = await relatoriosAPI.financeiro({ ano: gerarAno, mes: gerarMes })
        tipoNome = 'financeiro'
      } else if (gerarTipo === 'frota') {
        response = await relatoriosAPI.frota()
        tipoNome = 'frota'
      } else if (gerarTipo === 'clientes') {
        response = await relatoriosAPI.clientes()
        tipoNome = 'clientes'
      } else if (gerarTipo === 'contratos') {
        response = await relatoriosAPI.contratos()
        tipoNome = 'contratos'
      }

      if (response?.data) {
        setReportResult(response.data)
        setReportResultTipo(tipoNome)
        // Open the report in a new window for printing/PDF
        const html = buildReportHTML(response.data, tipoNome)
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
        }
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar relatório. Verifique a conexão com o servidor.')
    } finally {
      setIsGenerating(false)
      setIsModalOpen(false)
    }
  }

  const handleDownload = async (relatorio: Relatorio) => {
    setIsDownloading(relatorio.id)
    try {
      let response
      let tipoNome = ''

      // Map report tipo to the correct API endpoint
      if (relatorio.tipo === 'receitas' || relatorio.tipo === 'despesas') {
        response = await relatoriosAPI.financeiro()
        tipoNome = 'financeiro'
      } else if (relatorio.tipo === 'veiculos') {
        response = await relatoriosAPI.frota()
        tipoNome = 'frota'
      } else if (relatorio.tipo === 'clientes') {
        response = await relatoriosAPI.clientes()
        tipoNome = 'clientes'
      } else if (relatorio.tipo === 'contratos') {
        response = await relatoriosAPI.contratos()
        tipoNome = 'contratos'
      }

      if (response?.data) {
        const html = buildReportHTML(response.data, tipoNome)
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
        }
      }
    } catch (err) {
      console.error('Erro ao baixar relatório:', err)
      alert('Erro ao gerar o download. Verifique a conexão.')
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Visualização e download de relatórios</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <BarChart3 size={20} />
          Gerar Relatório
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Type Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTipoFilter(tab.value)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                tipoFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Filter size={18} />
            Filtrar
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Carregando...
          </div>
        ) : relatorios.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhum relatório encontrado
          </div>
        ) : (
          relatorios.map((relatorio) => {
            const tipoConfig = tiposConfig[relatorio.tipo] || defaultTipo
            return (
              <div
                key={relatorio.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className={`${tipoConfig.color}`} size={24} />
                      <h3 className="text-lg font-semibold text-gray-900">{relatorio.nome}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{relatorio.descricao}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className={`font-medium ${tipoConfig.color}`}>
                        {tipoConfig.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Período:</span>
                      <span className="font-medium text-gray-900">{relatorio.periodo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gerado em:</span>
                      <span className="font-medium text-gray-900">
                        {relatorio.data_geracao
                          ? format(new Date(relatorio.data_geracao), 'dd/MM/yyyy HH:mm', {
                              locale: ptBR,
                            })
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(relatorio)}
                    disabled={isDownloading === relatorio.id}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isDownloading === relatorio.id ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Gerar Relatório Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Gerar Novo Relatório"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relatório</label>
            <select
              value={gerarTipo}
              onChange={(e) => setGerarTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="financeiro">Financeiro (Receitas e Despesas)</option>
              <option value="frota">Frota (Utilização de Veículos)</option>
              <option value="clientes">Clientes</option>
              <option value="contratos">Contratos</option>
            </select>
          </div>

          {gerarTipo === 'financeiro' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <input
                  type="number"
                  value={gerarAno}
                  onChange={(e) => setGerarAno(parseInt(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <select
                  value={gerarMes}
                  onChange={(e) => setGerarMes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={1}>Janeiro</option>
                  <option value={2}>Fevereiro</option>
                  <option value={3}>Março</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Maio</option>
                  <option value={6}>Junho</option>
                  <option value={7}>Julho</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Setembro</option>
                  <option value={10}>Outubro</option>
                  <option value={11}>Novembro</option>
                  <option value={12}>Dezembro</option>
                </select>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <FileText size={16} className="inline mr-1" />
              O relatório será gerado e aberto em uma nova janela para impressão ou salvamento como PDF.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGerarRelatorio}
              disabled={isGenerating}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <BarChart3 size={18} />
                  Gerar Relatório
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Relatorios
