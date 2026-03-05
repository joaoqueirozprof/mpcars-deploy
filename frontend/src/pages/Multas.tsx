import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { multasAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Multa {
  id: string
  veiculo_id: string
  contrato_id: string
  cliente_id: string
  auto_infracao: string
  valor: number
  data_infracao: string
  data_notificacao: string
  pontos: number
  gravidade: string
  responsavel: string
  data_pagamento?: string
  status: string
  descricao: string
}

interface FormData {
  veiculo_id: string
  contrato_id: number
  cliente_id: number
  auto_infracao: string
  valor: number
  data_infracao: string
  data_notificacao: string
  pontos: number
  gravidade: string
  responsavel: string
  data_pagamento: string
  status: string
  descricao: string
}

const Multas: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMulta, setEditingMulta] = useState<Multa | null>(null)
  const [formData, setFormData] = useState<FormData>({
    veiculo_id: '',
    contrato_id: 0,
    cliente_id: 0,
    auto_infracao: '',
    valor: 0,
    data_infracao: '',
    data_notificacao: '',
    pontos: 0,
    gravidade: 'Leve',
    responsavel: '',
    data_pagamento: '',
    status: 'Pendente',
    descricao: '',
  })

  const { data: multasData, isLoading } = useQuery({
    queryKey: ['multas'],
    queryFn: async () => {
      const response = await multasAPI.list()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: veiculosData } = useQuery({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const response = await veiculosAPI.list()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => multasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingMulta ? multasAPI.update(editingMulta.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => multasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
    },
  })

  const multas: Multa[] = multasData?.items || []
  const veiculos = veiculosData?.items || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'Paga': { label: 'Paga', color: 'text-success', bgColor: 'bg-green-100' },
    'Pendente': { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    'Recorrida': { label: 'Recorrida', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    'Cancelada': { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
    pago: { label: 'Paga', color: 'text-success', bgColor: 'bg-green-100' },
    pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    vencido: { label: 'Vencido', color: 'text-danger', bgColor: 'bg-red-100' },
  }

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      contrato_id: 0,
      cliente_id: 0,
      auto_infracao: '',
      valor: 0,
      data_infracao: '',
      data_notificacao: '',
      pontos: 0,
      gravidade: 'Leve',
      responsavel: '',
      data_pagamento: '',
      status: 'Pendente',
      descricao: '',
    })
    setEditingMulta(null)
  }

  const handleOpenModal = (multa?: Multa) => {
    if (multa) {
      setEditingMulta(multa)
      setFormData({
        veiculo_id: multa.veiculo_id,
        contrato_id: parseInt(multa.contrato_id as any) || 0,
        cliente_id: parseInt(multa.cliente_id as any) || 0,
        auto_infracao: multa.auto_infracao,
        valor: multa.valor,
        data_infracao: multa.data_infracao,
        data_notificacao: multa.data_notificacao,
        pontos: multa.pontos,
        gravidade: multa.gravidade,
        responsavel: multa.responsavel,
        data_pagamento: multa.data_pagamento || '',
        status: multa.status,
        descricao: multa.descricao,
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMulta) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta multa?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multas</h1>
          <p className="text-gray-600 mt-1">Gestão de multas de trânsito</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Multa
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Auto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Pontos</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Gravidade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Notificação</th>
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
            ) : multas.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma multa encontrada
                </td>
              </tr>
            ) : (
              multas.map((multa) => {
                const status = statusConfig[multa.status] || statusConfig['Pendente']
                return (
                  <tr key={multa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{multa.veiculo_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">{multa.auto_infracao}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{multa.pontos}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{multa.gravidade}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {multa.data_notificacao ? format(new Date(multa.data_notificacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(multa)}
                          className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(multa.id)}
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
        title={editingMulta ? 'Editar Multa' : 'Nova Multa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">ID do Contrato</label>
              <input
                type="number"
                value={formData.contrato_id}
                onChange={(e) => setFormData({ ...formData, contrato_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID do Cliente</label>
              <input
                type="number"
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto de Infração</label>
              <input
                type="text"
                value={formData.auto_infracao}
                onChange={(e) => setFormData({ ...formData, auto_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Pontos na CNH</label>
              <input
                type="number"
                value={formData.pontos}
                onChange={(e) => setFormData({ ...formData, pontos: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Infração</label>
              <input
                type="date"
                value={formData.data_infracao}
                onChange={(e) => setFormData({ ...formData, data_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Notificação</label>
              <input
                type="date"
                value={formData.data_notificacao}
                onChange={(e) => setFormData({ ...formData, data_notificacao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
              <select
                value={formData.gravidade}
                onChange={(e) => setFormData({ ...formData, gravidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Leve">Leve</option>
                <option value="Média">Média</option>
                <option value="Grave">Grave</option>
                <option value="Gravíssima">Gravíssima</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <input
                type="text"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
              <input
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Pendente">Pendente</option>
                <option value="Paga">Paga</option>
                <option value="Recorrida">Recorrida</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
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

export default Multas
