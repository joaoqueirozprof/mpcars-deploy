import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financeiroAPI } from '../services/api'
import { Plus, Filter, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Financeiro {
  id: string
  contrato: string
  cliente: string
  descricao: string
  valor: number
  dataPagamento?: string
  dataVencimento: string
  status: 'pago' | 'pendente' | 'vencido'
  tipo: 'receita' | 'despesa'
}

type StatusFilter = 'todos' | 'pago' | 'pendente' | 'vencido'

const Financeiro: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'receita' | 'despesa'>('todos')

  const { data: financeiroData, isLoading } = useQuery({
    queryKey: ['financeiro', statusFilter, tipoFilter],
    queryFn: () =>
      financeiroAPI.list({
        status: statusFilter === 'todos' ? undefined : statusFilter,
        tipo: tipoFilter === 'todos' ? undefined : tipoFilter,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const lancamentos: Financeiro[] = financeiroData?.data || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    pago: {
      label: 'Pago',
      color: 'text-success',
      bgColor: 'bg-green-100',
      icon: <CheckCircle size={16} />,
    },
    pendente: {
      label: 'Pendente',
      color: 'text-warning',
      bgColor: 'bg-yellow-100',
      icon: <Clock size={16} />,
    },
    vencido: {
      label: 'Vencido',
      color: 'text-danger',
      bgColor: 'bg-red-100',
      icon: <AlertCircle size={16} />,
    },
  }

  const totals = {
    receita: lancamentos
      .filter((l) => l.tipo === 'receita')
      .reduce((acc, l) => acc + l.valor, 0),
    despesa: lancamentos
      .filter((l) => l.tipo === 'despesa')
      .reduce((acc, l) => acc + l.valor, 0),
  }

  const saldo = totals.receita - totals.despesa

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600 mt-1">Controle de receitas e despesas</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Novo Lançamento
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm font-medium">Total de Receitas</p>
          <p className="text-2xl font-bold text-success mt-2">
            R$ {totals.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm font-medium">Total de Despesas</p>
          <p className="text-2xl font-bold text-danger mt-2">
            R$ {totals.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`border rounded-lg p-6 ${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-gray-600 text-sm font-medium">Saldo</p>
          <p className={`text-2xl font-bold mt-2 ${saldo >= 0 ? 'text-primary' : 'text-warning'}`}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
        </div>
        {(['todos', 'pago', 'pendente', 'vencido'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-6">
          <span className="text-sm font-medium text-gray-700">Tipo:</span>
        </div>
        {(['todos', 'receita', 'despesa'] as const).map((tipo) => (
          <button
            key={tipo}
            onClick={() => setTipoFilter(tipo)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              tipoFilter === tipo
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Descrição</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vencimento</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
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
            ) : lancamentos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nenhum lançamento encontrado
                </td>
              </tr>
            ) : (
              lancamentos.map((lancamento) => {
                const status = statusConfig[lancamento.status]
                return (
                  <tr key={lancamento.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-primary">{lancamento.contrato}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{lancamento.cliente}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{lancamento.descricao}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          lancamento.tipo === 'receita'
                            ? 'bg-green-100 text-success'
                            : 'bg-red-100 text-danger'
                        }`}
                      >
                        {lancamento.tipo.charAt(0).toUpperCase() + lancamento.tipo.slice(1)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${lancamento.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                      {lancamento.tipo === 'receita' ? '+' : '-'} R${' '}
                      {lancamento.valor.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(lancamento.dataVencimento), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Download size={18} />
                      </button>
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

export default Financeiro
