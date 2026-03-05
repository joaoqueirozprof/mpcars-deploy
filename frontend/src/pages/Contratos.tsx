import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contratosAPI, clientesAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Contrato {
  id: string
  cliente_id: string
  veiculo_id: string
  data_saida: string
  data_entrada: string
  valor_diaria: number
  valor_caucao: number
  status: 'Ativo' | 'Finalizado' | 'Cancelado'
}

interface FormData {
  cliente_id: string
  veiculo_id: string
  data_saida: string
  data_entrada: string
  valor_diaria: string
  valor_caucao: string
  status: 'Ativo' | 'Finalizado' | 'Cancelado'
}

type StatusFilter = 'Todos' | 'Ativo' | 'Finalizado' | 'Cancelado'

const Contratos: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    cliente_id: '',
    veiculo_id: '',
    data_saida: '',
    data_entrada: '',
    valor_diaria: '',
    valor_caucao: '',
    status: 'Ativo',
  })

  const queryClient = useQueryClient()

  const { data: contratosResponse, isLoading: contratosLoading } = useQuery({
    queryKey: ['contratos', statusFilter],
    queryFn: async () => {
      const response = await contratosAPI.list({
        status: statusFilter === 'Todos' ? undefined : statusFilter,
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: clientesResponse } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const response = await clientesAPI.list()
      return response.data
    },
  })

  const { data: veiculosResponse } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const response = await veiculosAPI.list()
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      contratosAPI.create({
        ...data,
        valor_diaria: parseFloat(data.valor_diaria),
        valor_caucao: parseFloat(data.valor_caucao),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      contratosAPI.update(editingId || '', {
        ...data,
        valor_diaria: parseFloat(data.valor_diaria),
        valor_caucao: parseFloat(data.valor_caucao),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => contratosAPI.finalize(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contratosAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
    },
  })

  const contratos: Contrato[] = contratosResponse?.items || []
  const clientes: any[] = clientesResponse?.items || []
  const veiculos: any[] = veiculosResponse?.items || []

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      data_saida: '',
      data_entrada: '',
      valor_diaria: '',
      valor_caucao: '',
      status: 'Ativo',
    })
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (contrato: any) => {
    setFormData({
      cliente_id: contrato.cliente_id || '',
      veiculo_id: contrato.veiculo_id || '',
      data_saida: contrato.data_saida || '',
      data_entrada: contrato.data_entrada || '',
      valor_diaria: contrato.valor_diaria?.toString() || '',
      valor_caucao: contrato.valor_caucao?.toString() || '',
      status: contrato.status || 'Ativo',
    })
    setEditingId(contrato.id)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este contrato?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFinalize = (id: string) => {
    if (confirm('Tem certeza que deseja finalizar este contrato?')) {
      finalizeMutation.mutate(id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    Ativo: {
      label: 'Ativo',
      color: 'text-success',
      bgColor: 'bg-green-100',
    },
    Finalizado: {
      label: 'Finalizado',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    Cancelado: {
      label: 'Cancelado',
      color: 'text-danger',
      bgColor: 'bg-red-100',
    },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de contratos de aluguel</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {(['Todos', 'Ativo', 'Finalizado', 'Cancelado'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === status
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Saída</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entrada</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor/Dia</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contratosLoading ? (
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
              contratos.map((contrato: any) => {
                const status = statusConfig[contrato.status]
                return (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-primary">{contrato.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {clientes.find((c: any) => c.id === contrato.cliente_id)?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {veiculos.find((v: any) => v.id === contrato.veiculo_id)?.placa || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(contrato.data_saida), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(contrato.data_entrada), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {contrato.valor_diaria?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(contrato)}
                          className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(contrato.id)}
                          className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={18} />
                        </button>
                        {contrato.status === 'Ativo' && (
                          <button
                            onClick={() => handleFinalize(contrato.id)}
                            className="p-2 text-success hover:bg-green-50 rounded-lg transition-colors"
                            title="Finalizar"
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Contrato' : 'Novo Contrato'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              name="cliente_id"
              value={formData.cliente_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente: any) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
            <select
              name="veiculo_id"
              value={formData.veiculo_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione um veículo</option>
              {veiculos.map((veiculo: any) => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa} - {veiculo.modelo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Saída</label>
            <input
              type="date"
              name="data_saida"
              value={formData.data_saida}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrada</label>
            <input
              type="date"
              name="data_entrada"
              value={formData.data_entrada}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Diária</label>
            <input
              type="number"
              name="valor_diaria"
              value={formData.valor_diaria}
              onChange={handleInputChange}
              required
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Caução</label>
            <input
              type="number"
              name="valor_caucao"
              value={formData.valor_caucao}
              onChange={handleInputChange}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Ativo">Ativo</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Contratos
