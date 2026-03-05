import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relatoriosAPI } from '../services/api'
import { Download, Filter, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

  const tiposConfig = {
    receitas: { label: 'Receitas', color: 'text-success' },
    despesas: { label: 'Despesas', color: 'text-danger' },
    veiculos: { label: 'Veículos', color: 'text-primary' },
    clientes: { label: 'Clientes', color: 'text-warning' },
    contratos: { label: 'Contratos', color: 'text-info' },
  }

  const filterTabs: { value: TipoFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'receitas', label: 'Receitas' },
    { value: 'despesas', label: 'Despesas' },
    { value: 'veiculos', label: 'Veículos' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'contratos', label: 'Contratos' },
  ]

  const handleDownload = (relatorio: Relatorio) => {
    console.log('Baixando relatório:', relatorio.id)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Visualização e download de relatórios</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
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
            const tipoConfig = tiposConfig[relatorio.tipo]
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
                        {format(new Date(relatorio.data_geracao), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(relatorio)}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Relatorios
