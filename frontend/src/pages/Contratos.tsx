import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contratosAPI } from '../services/api'
import { Plus, CheckCircle, Eye, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Contrato {
  id: string
  numero: string
  cliente: string
  veiculo: string
  dataSaida: string
  dataEntrada: string
  dataEntradaReal?: string
  status: 'ativo' | 'finalizado' | 'cancelado'
  total: number
}

type StatusFilter = 'todos' | 'ativo' | 'finalizado'

const Contratos: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')

  const { data: contratosData, isLoading } = useQuery({
    queryKey: ['contratos', statusFilter],
    queryFn: () =>
      contratosAPI.list({
        status: statusFilter === 'todos' ? undefined : statusFilter,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const contratos: Contrato[] = contratosData?.data || []

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'ativo', label: 'Ativos' },
    { value: 'finalizado', label: 'Finalizados' },
  ]

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    ativo: {
      label: 'Ativo',
      color: 'text-success',
      bgColor: 'bg-green-100',
    },
    finalizado: {
      label: 'Finalizado',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    cancelado: {
      label: 'Cancelado',
      color: 'text-danger',
      bgColor: 'bg-red-100',
    },
  }

  const handleFinalize = (id: string) => {
    if (confirm('Deseja finalizar este contrato?')) {
      console.log('Finalizar contrato:', id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de contratos de aluguel</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              statusFilter === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nº Contrato</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Saída</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Entrada</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : contratos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nenhum contrato encontrado
                </td>
              </tr>
            ) : (
              contratos.map((contrato) => {
                const status = statusConfig[contrato.status]
                return (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-primary">{contrato.numero}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contrato.cliente}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{contrato.veiculo}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(contrato.dataSaida), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(contrato.dataEntrada), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {contrato.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Baixar PDF">
                          <Download size={18} />
                        </button>
                        {contrato.status === 'ativo' && (
                          <button
                            onClick={() => handleFinalize(contrato.id)}
                            className="p-2 text-success hover:bg-green-50 rounded-lg transition-colors"
                            title="Finalizar contrato"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Contratos
