import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { segurosAPI, veiculosAPI, parcelasSeguroAPI } from '../services/api'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Seguro {
  id: string
  veiculo_id: string
  seguradora: string
  numero_apolice: string
  tipo_seguro: 'Completo' | 'Terceiros' | 'Incêndio/Roubo'
  data_inicio: string
  data_vencimento: string
  valor: number
  valor_franquia: number
  cobertura: string
  quantidade_parcelas: number
  status: 'Ativo' | 'Vencido' | 'Cancelado'
  observacoes: string
}

interface Parcela {
  id: string
  seguro_id: string
  veiculo_id: string
  numero_parcela: number
  valor: number
  vencimento: string
  data_pagamento: string | null
  status: 'Pendente' | 'Pago'
  mes_referencia: string
  observacoes: string
}

interface FormData {
  veiculo_id: string
  seguradora: string
  numero_apolice: string
  tipo_seguro: 'Completo' | 'Terceiros' | 'Incêndio/Roubo'
  data_inicio: string
  data_vencimento: string
  valor: number
  valor_franquia: number
  cobertura: string
  quantidade_parcelas: number
  status: 'Ativo' | 'Vencido' | 'Cancelado'
  observacoes: string
}

const Seguros: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedSeguro, setExpandedSeguro] = useState<string | null>(null)
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null)
  const [formData, setFormData] = useState<FormData>({
    veiculo_id: '',
    seguradora: '',
    numero_apolice: '',
    tipo_seguro: 'Completo',
    data_inicio: '',
    data_vencimento: '',
    valor: 0,
    valor_franquia: 0,
    cobertura: '',
    quantidade_parcelas: 1,
    status: 'Ativo',
    observacoes: '',
  })

  const { data: segurosData, isLoading } = useQuery({
    queryKey: ['seguros'],
    queryFn: async () => {
      const response = await segurosAPI.list()
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

  const { data: parcelasData } = useQuery({
    queryKey: ['parcelas-seguro'],
    queryFn: async () => {
      const response = await parcelasSeguroAPI.list()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => segurosAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      editingSeguro ? segurosAPI.update(editingSeguro.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => segurosAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
    },
  })

  const updateParcelaMutation = useMutation({
    mutationFn: (data: { id: string; payload: Record<string, any> }) =>
      parcelasSeguroAPI.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelas-seguro'] })
    },
  })

  const seguros: Seguro[] = segurosData?.items || []
  const veiculos = veiculosData?.items || []
  const parcelas: Parcela[] = parcelasData?.items || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    Ativo: { label: 'Ativo', color: 'text-green-600', bgColor: 'bg-green-100' },
    Vencido: { label: 'Vencido', color: 'text-red-600', bgColor: 'bg-red-100' },
    Cancelado: { label: 'Cancelado', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  }
  const defaultStatus = { label: 'Desconhecido', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  const parcelaStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    Pendente: { label: 'Pendente', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    Pago: { label: 'Pago', color: 'text-green-600', bgColor: 'bg-green-100' },
  }

  const getParcelasBySegurado = (seguroId: string) => {
    return parcelas.filter((p) => p.seguro_id === seguroId)
  }

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      seguradora: '',
      numero_apolice: '',
      tipo_seguro: 'Completo',
      data_inicio: '',
      data_vencimento: '',
      valor: 0,
      valor_franquia: 0,
      cobertura: '',
      quantidade_parcelas: 1,
      status: 'Ativo',
      observacoes: '',
    })
    setEditingSeguro(null)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as any
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value ? parseFloat(value) : 0) : value,
    })
  }

  const handleOpenModal = (seguro?: Seguro) => {
    if (seguro) {
      setEditingSeguro(seguro)
      setFormData({
        veiculo_id: seguro.veiculo_id,
        seguradora: seguro.seguradora,
        numero_apolice: seguro.numero_apolice,
        tipo_seguro: seguro.tipo_seguro,
        data_inicio: seguro.data_inicio,
        data_vencimento: seguro.data_vencimento,
        valor: seguro.valor,
        valor_franquia: seguro.valor_franquia,
        cobertura: seguro.cobertura,
        quantidade_parcelas: seguro.quantidade_parcelas,
        status: seguro.status,
        observacoes: seguro.observacoes,
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSeguro) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este seguro?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading2 = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seguros</h1>
          <p className="text-gray-600 mt-1">Gestão de seguros veiculares</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Seguro
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Seguradora</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nº Apólice</th>
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
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : seguros.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Nenhum seguro encontrado
                </td>
              </tr>
            ) : (
              seguros.map((seguro) => {
                const status = statusConfig[seguro.status] || defaultStatus
                const seguroParecelas = getParcelasBySegurado(seguro.id)
                const isExpanded = expandedSeguro === seguro.id

                return (
                  <React.Fragment key={seguro.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {seguroParecelas.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedSeguro(isExpanded ? null : seguro.id)
                            }
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {veiculos.find((v) => v.id === seguro.veiculo_id)?.placa || seguro.veiculo_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{seguro.seguradora}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                        {seguro.numero_apolice}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{seguro.tipo_seguro}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        R$ {(seguro.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {seguro.data_vencimento
                          ? format(new Date(seguro.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(seguro)}
                            className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(seguro.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && seguroParecelas.length > 0 && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Parcelas ({seguroParecelas.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border border-gray-200 rounded-lg">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                                      Nº
                                    </th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                                      Valor
                                    </th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                                      Vencimento
                                    </th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                                      Status
                                    </th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                                      Ação
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {seguroParecelas.map((parcela) => {
                                    const parcelaStatus =
                                      parcelaStatusConfig[parcela.status] ||
                                      parcelaStatusConfig['Pendente']
                                    return (
                                      <tr key={parcela.id} className="hover:bg-white transition-colors">
                                        <td className="px-4 py-2 text-gray-900">
                                          {parcela.numero_parcela}
                                        </td>
                                        <td className="px-4 py-2 font-semibold text-gray-900">
                                          R${' '}
                                          {(parcela.valor || 0).toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">
                                          {format(new Date(parcela.vencimento), 'dd/MM/yyyy', {
                                            locale: ptBR,
                                          })}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${parcelaStatus.bgColor} ${parcelaStatus.color}`}
                                          >
                                            {parcelaStatus.label}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2">
                                          {parcela.status === 'Pendente' && (
                                            <button
                                              onClick={() => {
                                                const today = format(new Date(), 'yyyy-MM-dd')
                                                updateParcelaMutation.mutate({
                                                  id: parcela.id,
                                                  payload: {
                                                    status: 'Pago',
                                                    data_pagamento: today,
                                                  },
                                                })
                                              }}
                                              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors font-medium"
                                            >
                                              Marcar Pago
                                            </button>
                                          )}
                                          {parcela.status === 'Pago' && (
                                            <span className="text-xs text-gray-500">
                                              Pago em{' '}
                                              {parcela.data_pagamento
                                                ? format(new Date(parcela.data_pagamento), 'dd/MM/yyyy', {
                                                    locale: ptBR,
                                                  })
                                                : '-'}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        title={editingSeguro ? 'Editar Seguro' : 'Novo Seguro'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
              <select
                name="veiculo_id"
                value={formData.veiculo_id}
                onChange={handleInputChange}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Seguradora</label>
              <input
                type="text"
                name="seguradora"
                value={formData.seguradora}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Apólice</label>
              <input
                type="text"
                name="numero_apolice"
                value={formData.numero_apolice}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Seguro</label>
              <select
                name="tipo_seguro"
                value={formData.tipo_seguro}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Completo">Completo</option>
                <option value="Terceiros">Terceiros</option>
                <option value="Incêndio/Roubo">Incêndio/Roubo</option>
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                name="data_inicio"
                value={formData.data_inicio}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Vencimento</label>
              <input
                type="date"
                name="data_vencimento"
                value={formData.data_vencimento}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
              <input
                type="number"
                name="valor"
                step="0.01"
                value={formData.valor}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Franquia</label>
              <input
                type="number"
                name="valor_franquia"
                step="0.01"
                value={formData.valor_franquia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 5 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cobertura</label>
            <textarea
              name="cobertura"
              value={formData.cobertura}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Row 6 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Parcelas</label>
              <input
                type="number"
                name="quantidade_parcelas"
                min="1"
                value={formData.quantidade_parcelas}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Ativo">Ativo</option>
                <option value="Vencido">Vencido</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Row 7 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Message for new seguros with parcelas */}
          {!editingSeguro && formData.quantidade_parcelas > 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              Parcelas podem ser gerenciadas após criar o seguro. Crie primeiro e depois adicione/edite as parcelas.
            </div>
          )}

          {/* Buttons */}
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

export default Seguros
