import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'

interface Veiculo {
  id: string
  marca: string
  modelo: string
  placa: string
  ano: number
  status: string
  km_atual: number
  cor: string
  empresa_id: string
  combustivel: string
  tipo_veiculo: string
  chassi?: string
  renavam?: string
}

interface FormData {
  marca: string
  modelo: string
  placa: string
  ano: number
  km_atual: number
  cor: string
  status: string
  empresa_id: string
  combustivel: string
  tipo_veiculo: string
  chassi?: string
  renavam?: string
}

type StatusFilter = 'todos' | 'disponivel' | 'alugado' | 'manutencao'

const Veiculos: React.FC = () => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null)
  const [formData, setFormData] = useState<FormData>({
    marca: '',
    modelo: '',
    placa: '',
    ano: new Date().getFullYear(),
    km_atual: 0,
    cor: '',
    status: 'Disponível',
    empresa_id: '',
    combustivel: '',
    tipo_veiculo: '',
    chassi: '',
    renavam: '',
  })

  const { data: veiculosData, isLoading } = useQuery({
    queryKey: ['veiculos', statusFilter],
    queryFn: async () => {
      const response = await veiculosAPI.list({
        status: statusFilterMap[statusFilter],
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => veiculosAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingVeiculo ? veiculosAPI.update(editingVeiculo.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => veiculosAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
    },
  })

  const veiculos: Veiculo[] = veiculosData?.items || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'Disponível': {
      label: 'Disponível',
      color: 'text-success',
      bgColor: 'bg-green-100',
    },
    'Alugado': {
      label: 'Alugado',
      color: 'text-primary',
      bgColor: 'bg-blue-100',
    },
    'Manutenção': {
      label: 'Manutenção',
      color: 'text-warning',
      bgColor: 'bg-yellow-100',
    },
  }

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'disponivel', label: 'Disponíveis' },
    { value: 'alugado', label: 'Alugados' },
    { value: 'manutencao', label: 'Manutenção' },
  ]

  const statusFilterMap: Record<StatusFilter, string | undefined> = {
    todos: undefined,
    disponivel: 'Disponível',
    alugado: 'Alugado',
    manutencao: 'Manutenção',
  }

  const resetForm = () => {
    setFormData({
      marca: '',
      modelo: '',
      placa: '',
      ano: new Date().getFullYear(),
      km_atual: 0,
      cor: '',
      status: 'Disponível',
      empresa_id: '',
      combustivel: '',
      tipo_veiculo: '',
      chassi: '',
      renavam: '',
    })
    setEditingVeiculo(null)
  }

  const handleOpenModal = (veiculo?: Veiculo) => {
    if (veiculo) {
      setEditingVeiculo(veiculo)
      setFormData({
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        placa: veiculo.placa,
        ano: veiculo.ano,
        km_atual: veiculo.km_atual,
        cor: veiculo.cor,
        status: veiculo.status,
        empresa_id: veiculo.empresa_id,
        combustivel: veiculo.combustivel,
        tipo_veiculo: veiculo.tipo_veiculo,
        chassi: veiculo.chassi || '',
        renavam: veiculo.renavam || '',
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingVeiculo) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este veículo?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-600 mt-1">Gestão da frota de veículos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Veículo
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

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Carregando...
          </div>
        ) : veiculos.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhum veículo encontrado
          </div>
        ) : (
          veiculos.map((veiculo) => {
            const status = statusConfig[veiculo.status]
            return (
              <div
                key={veiculo.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="h-40 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{veiculo.marca}</p>
                    <p className="text-gray-100 text-sm">{veiculo.modelo}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Placa</p>
                    <p className="font-mono font-bold text-lg">{veiculo.placa}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Ano</p>
                      <p className="font-semibold">{veiculo.ano}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">KM</p>
                      <p className="font-semibold">{veiculo.km_atual.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Combustível</p>
                      <p className="font-semibold text-xs">{veiculo.combustivel}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tipo</p>
                      <p className="font-semibold text-xs">{veiculo.tipo_veiculo}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Cor</p>
                    <p className="text-sm font-medium">{veiculo.cor}</p>
                  </div>

                  <div className="pt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleOpenModal(veiculo)}
                      className="flex-1 px-3 py-2 text-primary hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(veiculo.id)}
                      className="flex-1 px-3 py-2 text-danger hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} />
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                required
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Atual</label>
              <input
                type="number"
                value={formData.km_atual}
                onChange={(e) => setFormData({ ...formData, km_atual: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <input
                type="text"
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Combustível</label>
              <select
                value={formData.combustivel}
                onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Diesel">Diesel</option>
                <option value="Álcool">Álcool</option>
                <option value="Flex">Flex</option>
                <option value="Elétrico">Elétrico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Veículo</label>
              <select
                value={formData.tipo_veiculo}
                onChange={(e) => setFormData({ ...formData, tipo_veiculo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Perua">Perua</option>
                <option value="Pickup">Pickup</option>
                <option value="Van">Van</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa ID</label>
              <input
                type="number"
                value={formData.empresa_id}
                onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Disponível">Disponível</option>
                <option value="Alugado">Alugado</option>
                <option value="Manutenção">Manutenção</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chassi</label>
              <input
                type="text"
                value={formData.chassi}
                onChange={(e) => setFormData({ ...formData, chassi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renavam</label>
              <input
                type="text"
                value={formData.renavam}
                onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
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

export default Veiculos
