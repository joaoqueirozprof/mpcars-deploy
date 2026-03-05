import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reservasAPI, clientesAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Reserva {
  id: string
  cliente_id: string
  veiculo_id: string
  data_inicio: string
  data_fim: string
  status: 'confirmada' | 'cancelada' | 'concluida'
}

interface FormData {
  cliente_id: string
  veiculo_id: string
  data_inicio: string
  data_fim: string
  status: string
}

const Reservas: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null)
  const [formData, setFormData] = useState<FormData>({
    cliente_id: '',
    veiculo_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'confirmada',
  })

  const { data: reservasData, isLoading } = useQuery({
    queryKey: ['reservas'],
    queryFn: async () => {
      const response = await reservasAPI.list()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const response = await clientesAPI.list()
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
    mutationFn: (data: FormData) => reservasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingReserva ? reservasAPI.update(editingReserva.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reservasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
    },
  })

  const reservas: Reserva[] = reservasData?.items || []
  const clientes = clientesData?.items || []
  const veiculos = veiculosData?.items || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    confirmada: { label: 'Confirmada', color: 'text-success', bgColor: 'bg-green-100' },
    cancelada: { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
    concluida: { label: 'Concluída', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      data_inicio: '',
      data_fim: '',
      status: 'confirmada',
    })
    setEditingReserva(null)
  }

  const handleOpenModal = (reserva?: Reserva) => {
    if (reserva) {
      setEditingReserva(reserva)
      setFormData({
        cliente_id: reserva.cliente_id,
        veiculo_id: reserva.veiculo_id,
        data_inicio: reserva.data_inicio,
        data_fim: reserva.data_fim,
        status: reserva.status,
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingReserva) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta reserva?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600 mt-1">Gestão de reservas de veículos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Reserva
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Início</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Fim</th>
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
            ) : reservas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma reserva encontrada
                </td>
              </tr>
            ) : (
              reservas.map((reserva) => {
                const status = statusConfig[reserva.status]
                return (
                  <tr key={reserva.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{reserva.cliente_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{reserva.veiculo_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(reserva.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(reserva)}
                          className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(reserva.id)}
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
        title={editingReserva ? 'Editar Reserva' : 'Nova Reserva'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
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
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="concluida">Concluída</option>
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

export default Reservas
