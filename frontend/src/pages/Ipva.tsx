import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipvaAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface IPVA {
  id: string
  veiculo_id: string
  valor: number
  data_vencimento: string
  status: 'pago' | 'pendente' | 'vencido'
  ano: number
}

interface FormData {
  veiculo_id: string
  valor: number
  data_vencimento: string
  status: string
  ano: number
}

const IPVA: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIPVA, setEditingIPVA] = useState<IPVA | null>(null)
  const [formData, setFormData] = useState<FormData>({
    veiculo_id: '',
    valor: 0,
    data_vencimento: '',
    status: 'pendente',
    ano: new Date().getFullYear(),
  })

  const { data: ipvaData, isLoading } = useQuery({
    queryKey: ['ipva'],
    queryFn: () => ipvaAPI.list(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: veiculosData } = useQuery({
    queryKey: ['veiculos'],
    queryFn: () => veiculosAPI.list(),
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => ipvaAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingIPVA ? ipvaAPI.update(editingIPVA.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ipvaAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
    },
  })

  const ipvas: IPVA[] = ipvaData?.data || []
  const veiculos = veiculosData?.data || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pago: { label: 'Pago', color: 'text-success', bgColor: 'bg-green-100' },
    pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    vencido: { label: 'Vencido', color: 'text-danger', bgColor: 'bg-red-100' },
  }

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      valor: 0,
      data_vencimento: '',
      status: 'pendente',
      ano: new Date().getFullYear(),
    })
    setEditingIPVA(null)
  }

  const handleOpenModal = (ipva?: IPVA) => {
    if (ipva) {
      setEditingIPVA(ipva)
      setFormData({
        veiculo_id: ipva.veiculo_id,
        valor: ipva.valor,
        data_vencimento: ipva.data_vencimento,
        status: ipva.status,
        ano: ipva.ano,
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingIPVA) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este IPVA?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IPVA</h1>
          <p className="text-gray-600 mt-1">Gestão de IPVA dos veículos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo IPVA
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ano</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vencimento</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : ipvas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhum IPVA encontrado
                </td>
              </tr>
            ) : (
              ipvas.map((ipva) => {
                const status = statusConfig[ipva.status]
                return (
                  <tr key={ipva.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{ipva.veiculo_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ipva.ano}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {ipva.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(ipva.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(ipva)}
                          className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(ipva.id)}
                          className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
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
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingIPVA ? 'Editar IPVA' : 'Novo IPVA'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
              <select
                value={formData.veiculo_id}
                onChange={(e) => setFormData({ ...formData, veiculo_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um veículo</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.placa})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Vencimento</label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading2}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50"
            >
              {isLoading2 ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default IPVA
