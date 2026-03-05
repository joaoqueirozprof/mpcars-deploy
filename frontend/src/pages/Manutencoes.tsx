import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { manutencoesAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Manutencao {
  id: string
  veiculo_id: string
  tipo: string
  custo: number
  data_realizada: string
  data_proxima?: string
  km_realizada: number
  km_proxima: number
  oficina: string
  status: string
  descricao: string
}

interface FormData {
  veiculo_id: string
  tipo: string
  custo: number
  data_realizada: string
  data_proxima: string
  km_realizada: number
  km_proxima: number
  oficina: string
  status: string
  descricao: string
}

const Manutencoes: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingManutencao, setEditingManutencao] = useState<Manutencao | null>(null)
  const [formData, setFormData] = useState<FormData>({
    veiculo_id: '',
    tipo: 'Preventiva',
    custo: 0,
    data_realizada: '',
    data_proxima: '',
    km_realizada: 0,
    km_proxima: 0,
    oficina: '',
    status: 'Agendada',
    descricao: '',
  })

  const { data: manutencoeData, isLoading } = useQuery({
    queryKey: ['manutencoes'],
    queryFn: async () => {
      const response = await manutencoesAPI.list()
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
    mutationFn: (data: FormData) => manutencoesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingManutencao ? manutencoesAPI.update(editingManutencao.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => manutencoesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
    },
  })

  const manutencoes: Manutencao[] = manutencoeData?.items || []
  const veiculos = veiculosData?.items || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'Agendada': { label: 'Agendada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    agendada: { label: 'Agendada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    'Em andamento': { label: 'Em andamento', color: 'text-warning', bgColor: 'bg-yellow-100' },
    'Em Andamento': { label: 'Em andamento', color: 'text-warning', bgColor: 'bg-yellow-100' },
    em_andamento: { label: 'Em andamento', color: 'text-warning', bgColor: 'bg-yellow-100' },
    'Concluída': { label: 'Concluída', color: 'text-success', bgColor: 'bg-green-100' },
    Concluida: { label: 'Concluída', color: 'text-success', bgColor: 'bg-green-100' },
    concluida: { label: 'Concluída', color: 'text-success', bgColor: 'bg-green-100' },
    'Cancelada': { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
    cancelada: { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
  }
  const defaultStatus = { label: 'Desconhecido', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      tipo: 'Preventiva',
      custo: 0,
      data_realizada: '',
      data_proxima: '',
      km_realizada: 0,
      km_proxima: 0,
      oficina: '',
      status: 'Agendada',
      descricao: '',
    })
    setEditingManutencao(null)
  }

  const handleOpenModal = (manutencao?: Manutencao) => {
    if (manutencao) {
      setEditingManutencao(manutencao)
      setFormData({
        veiculo_id: manutencao.veiculo_id,
        tipo: manutencao.tipo,
        custo: manutencao.custo,
        data_realizada: manutencao.data_realizada,
        data_proxima: manutencao.data_proxima || '',
        km_realizada: manutencao.km_realizada,
        km_proxima: manutencao.km_proxima,
        oficina: manutencao.oficina,
        status: manutencao.status,
        descricao: manutencao.descricao,
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingManutencao) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta manutenção?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manutenções</h1>
          <p className="text-gray-600 mt-1">Gestão de manutenções de veículos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Manutenção
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Custo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">KM</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Realizada</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Próxima</th>
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
            ) : manutencoes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma manutenção encontrada
                </td>
              </tr>
            ) : (
              manutencoes.map((manutencao) => {
                const status = statusConfig[manutencao.status] || defaultStatus
                return (
                  <tr key={manutencao.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{manutencao.veiculo_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{manutencao.tipo}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {(manutencao.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {manutencao.km_realizada ? manutencao.km_realizada.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {manutencao.data_realizada ? format(new Date(manutencao.data_realizada), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {manutencao.data_proxima
                        ? format(new Date(manutencao.data_proxima), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(manutencao)}
                          className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(manutencao.id)}
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
        title={editingManutencao ? 'Editar Manutenção' : 'Nova Manutenção'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Preventiva">Preventiva</option>
                <option value="Corretiva">Corretiva</option>
                <option value="Revisão">Revisão</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.custo}
                onChange={(e) => setFormData({ ...formData, custo: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oficina</label>
              <input
                type="text"
                value={formData.oficina}
                onChange={(e) => setFormData({ ...formData, oficina: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Realizada</label>
              <input
                type="number"
                value={formData.km_realizada}
                onChange={(e) => setFormData({ ...formData, km_realizada: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Próxima</label>
              <input
                type="number"
                value={formData.km_proxima}
                onChange={(e) => setFormData({ ...formData, km_proxima: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Realizada</label>
              <input
                type="date"
                value={formData.data_realizada}
                onChange={(e) => setFormData({ ...formData, data_realizada: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Próxima</label>
              <input
                type="date"
                value={formData.data_proxima}
                onChange={(e) => setFormData({ ...formData, data_proxima: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
              <option value="Agendada">Agendada</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
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

export default Manutencoes
