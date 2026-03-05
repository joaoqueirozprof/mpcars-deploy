import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reservasAPI, clientesAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, List, Calendar } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Reserva {
  id: string
  cliente_id: string
  veiculo_id: string
  data_inicio: string
  data_fim: string
  valor_estimado?: number
  status: 'Pendente' | 'Confirmada' | 'Cancelada' | 'Convertida' | 'confirmada' | 'cancelada' | 'concluida'
  observacoes?: string
  cliente_nome?: string
  veiculo_nome?: string
}

interface FormData {
  cliente_id: string
  veiculo_id: string
  data_inicio: string
  data_fim: string
  valor_estimado: string
  status: string
  observacoes: string
}

const Reservas: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [formData, setFormData] = useState<FormData>({
    cliente_id: '',
    veiculo_id: '',
    data_inicio: '',
    data_fim: '',
    valor_estimado: '',
    status: 'Confirmada',
    observacoes: '',
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
    Confirmada: { label: 'Confirmada', color: 'text-success', bgColor: 'bg-green-100' },
    cancelada: { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
    Cancelada: { label: 'Cancelada', color: 'text-danger', bgColor: 'bg-red-100' },
    concluida: { label: 'Concluída', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    'Concluída': { label: 'Concluída', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    Pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    convertida: { label: 'Convertida', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    Convertida: { label: 'Convertida', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  }
  const defaultStatus = { label: 'Desconhecido', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      data_inicio: '',
      data_fim: '',
      valor_estimado: '',
      status: 'Confirmada',
      observacoes: '',
    })
    setEditingReserva(null)
  }

  const getReservasForDay = (day: Date): Reserva[] => {
    return reservas.filter((r) => {
      const inicio = parseISO(r.data_inicio)
      const fim = parseISO(r.data_fim)
      return isWithinInterval(day, { start: inicio, end: fim })
    })
  }

  const getStatusColor = (status: string): string => {
    const normalizedStatus = status.toLowerCase()
    if (normalizedStatus.includes('pendente')) return 'bg-yellow-100 text-yellow-800'
    if (normalizedStatus.includes('confirmada')) return 'bg-green-100 text-green-800'
    if (normalizedStatus.includes('cancelada')) return 'bg-red-100 text-red-800'
    if (normalizedStatus.includes('convertida')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
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

      {/* View Mode Toggle */}
      <div className="flex gap-2 bg-white rounded-lg shadow p-2 w-fit">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            viewMode === 'list'
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <List size={18} />
          Lista
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            viewMode === 'calendar'
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Calendar size={18} />
          Calendário
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Início</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Fim</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor Estimado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : reservas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma reserva encontrada
                  </td>
                </tr>
              ) : (
                reservas.map((reserva) => {
                  const status = statusConfig[reserva.status] || defaultStatus
                  return (
                    <tr key={reserva.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{reserva.cliente_nome || reserva.cliente_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{reserva.veiculo_nome || reserva.veiculo_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {format(new Date(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {format(new Date(reserva.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {reserva.valor_estimado ? `R$ ${reserva.valor_estimado.toFixed(2)}` : '-'}
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
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Header Row - Days of Week */}
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
              <div
                key={day}
                className="bg-gray-50 p-3 text-center text-xs font-semibold text-gray-600"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {(() => {
              const monthStart = startOfMonth(currentMonth)
              const monthEnd = endOfMonth(currentMonth)
              const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
              const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
              const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

              return calendarDays.map((day) => {
                const dayReservas = getReservasForDay(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isToday = isSameDay(day, new Date())
                const isSelected = selectedDay && isSameDay(day, selectedDay)

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`bg-white p-2 min-h-[100px] cursor-pointer border-2 transition-all ${
                      !isCurrentMonth ? 'opacity-40 bg-gray-50' : ''
                    } ${isToday ? 'border-blue-500 bg-blue-50' : isSelected ? 'border-primary bg-primary-50' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayReservas.slice(0, 2).map((r) => {
                        const status = statusConfig[r.status] || defaultStatus
                        return (
                          <div
                            key={r.id}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded ${status.bgColor}`}
                            title={r.cliente_nome || r.cliente_id}
                          >
                            {r.cliente_nome || r.cliente_id}
                          </div>
                        )
                      })}
                      {dayReservas.length > 2 && (
                        <span className="text-[10px] text-gray-500 px-1">
                          +{dayReservas.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {/* Selected Day Details */}
          {selectedDay && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-4">
                Reservas em {format(selectedDay, 'dd/MM/yyyy', { locale: ptBR })}
              </h3>
              {getReservasForDay(selectedDay).length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma reserva neste dia</p>
              ) : (
                <div className="space-y-3">
                  {getReservasForDay(selectedDay).map((reserva) => {
                    const status = statusConfig[reserva.status] || defaultStatus
                    return (
                      <div key={reserva.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {reserva.cliente_nome || reserva.cliente_id}
                            </p>
                            <p className="text-sm text-gray-600">
                              {reserva.veiculo_nome || reserva.veiculo_id}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="text-gray-500">Início:</span>{' '}
                            {format(new Date(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          <div>
                            <span className="text-gray-500">Fim:</span>{' '}
                            {format(new Date(reserva.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </div>
                        {reserva.valor_estimado && (
                          <p className="text-sm text-gray-600 mb-3">
                            <span className="text-gray-500">Valor:</span> R$ {reserva.valor_estimado.toFixed(2)}
                          </p>
                        )}
                        {reserva.observacoes && (
                          <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                            {reserva.observacoes}
                          </p>
                        )}
                        <div className="flex gap-2 pt-3 border-t">
                          <button
                            onClick={() => handleOpenModal(reserva)}
                            className="px-3 py-1 text-sm text-primary hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                          >
                            <Edit2 size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(reserva.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={16} />
                            Deletar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado</label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_estimado}
              onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
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
              <option value="Confirmada">Confirmada</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Convertida">Convertida</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              placeholder="Adicione observações sobre a reserva..."
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

export default Reservas
