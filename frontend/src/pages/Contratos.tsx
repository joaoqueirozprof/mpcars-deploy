import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contratosAPI, clientesAPI, veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2, CheckCircle, Printer, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'
import { gerarContratoHTML } from '../utils/contratoTemplate'

interface FormData {
  cliente_id: string
  veiculo_id: string
  tipo_locacao: string
  data_saida: string
  hora_saida: string
  data_prevista_devolucao: string
  km_saida: string
  km_livres_dia: string
  quantidade_diarias: string
  valor_diaria: string
  valor_hora_extra: string
  valor_km_excedente: string
  combustivel_saida: string
  cartao_tipo: string
  cartao_numero: string
  cartao_codigo: string
  cartao_preaut: string
  cartao_validade: string
  cartao_valor: string
  observacoes: string
  status: 'Ativo' | 'Finalizado' | 'Cancelado'
}

type StatusFilter = 'Todos' | 'Ativo' | 'Finalizado' | 'Cancelado'

const Contratos: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    cliente_id: '',
    veiculo_id: '',
    tipo_locacao: 'Cliente',
    data_saida: new Date().toISOString().split('T')[0],
    hora_saida: new Date().toTimeString().slice(0, 5),
    data_prevista_devolucao: '',
    km_saida: '',
    km_livres_dia: '200',
    quantidade_diarias: '1',
    valor_diaria: '',
    valor_hora_extra: '',
    valor_km_excedente: '',
    combustivel_saida: '1/1',
    cartao_tipo: '',
    cartao_numero: '',
    cartao_codigo: '',
    cartao_preaut: '',
    cartao_validade: '',
    cartao_valor: '',
    observacoes: '',
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
      const response = await clientesAPI.list({ limit: 100 })
      return response.data
    },
  })

  const { data: veiculosResponse } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const response = await veiculosAPI.list({ limit: 100 })
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => contratosAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => contratosAPI.update(editingId || '', data),
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

  const contratos: any[] = contratosResponse?.items || []
  const clientes: any[] = clientesResponse?.items || []
  const veiculos: any[] = veiculosResponse?.items || []

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      tipo_locacao: 'Cliente',
      data_saida: new Date().toISOString().split('T')[0],
      hora_saida: new Date().toTimeString().slice(0, 5),
      data_prevista_devolucao: '',
      km_saida: '',
      km_livres_dia: '200',
      quantidade_diarias: '1',
      valor_diaria: '',
      valor_hora_extra: '',
      valor_km_excedente: '',
      combustivel_saida: '1/1',
      cartao_tipo: '',
      cartao_numero: '',
      cartao_codigo: '',
      cartao_preaut: '',
      cartao_validade: '',
      cartao_valor: '',
      observacoes: '',
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
      cliente_id: contrato.cliente_id?.toString() || '',
      veiculo_id: contrato.veiculo_id?.toString() || '',
      tipo_locacao: contrato.tipo_locacao || 'Cliente',
      data_saida: contrato.data_saida || '',
      hora_saida: contrato.hora_saida || '',
      data_prevista_devolucao: contrato.data_prevista_devolucao || '',
      km_saida: contrato.km_saida?.toString() || '',
      km_livres_dia: contrato.km_livres_dia?.toString() || '200',
      quantidade_diarias: contrato.quantidade_diarias?.toString() || '1',
      valor_diaria: contrato.valor_diaria?.toString() || '',
      valor_hora_extra: contrato.valor_hora_extra?.toString() || '',
      valor_km_excedente: contrato.valor_km_excedente?.toString() || '',
      combustivel_saida: contrato.combustivel_saida || '1/1',
      cartao_tipo: contrato.cartao_tipo || '',
      cartao_numero: contrato.cartao_numero || '',
      cartao_codigo: contrato.cartao_codigo || '',
      cartao_preaut: contrato.cartao_preaut || '',
      cartao_validade: contrato.cartao_validade || '',
      cartao_valor: contrato.cartao_valor?.toString() || '',
      observacoes: contrato.observacoes || '',
      status: contrato.status || 'Ativo',
    })
    setEditingId(contrato.id)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qtdDiarias = parseInt(formData.quantidade_diarias) || 1
    const valorDiaria = parseFloat(formData.valor_diaria) || 0
    const subtotal = qtdDiarias * valorDiaria
    const payload: any = {
      cliente_id: parseInt(formData.cliente_id),
      veiculo_id: parseInt(formData.veiculo_id),
      tipo_locacao: formData.tipo_locacao,
      data_saida: formData.data_saida,
      hora_saida: formData.hora_saida || null,
      data_entrada: formData.data_prevista_devolucao,
      data_prevista_devolucao: formData.data_prevista_devolucao,
      km_saida: parseFloat(formData.km_saida) || 0,
      km_livres_dia: parseFloat(formData.km_livres_dia) || 0,
      quantidade_diarias: qtdDiarias,
      valor_diaria: valorDiaria,
      valor_hora_extra: parseFloat(formData.valor_hora_extra) || 0,
      valor_km_excedente: parseFloat(formData.valor_km_excedente) || 0,
      combustivel_saida: formData.combustivel_saida,
      cartao_tipo: formData.cartao_tipo || null,
      cartao_numero: formData.cartao_numero || null,
      cartao_codigo: formData.cartao_codigo || null,
      cartao_preaut: formData.cartao_preaut || null,
      cartao_validade: formData.cartao_validade || null,
      cartao_valor: parseFloat(formData.cartao_valor) || null,
      subtotal: subtotal,
      total: subtotal,
      observacoes: formData.observacoes || null,
      status: formData.status,
    }
    if (editingId) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
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

  const handlePrintContract = async (contratoId: string) => {
    setIsPrinting(contratoId)
    try {
      const response = await contratosAPI.get(contratoId)
      const contratoFull = response.data
      const html = gerarContratoHTML(contratoFull)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } catch (err) {
      alert('Erro ao gerar contrato. Tente novamente.')
    } finally {
      setIsPrinting(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    Ativo: { label: 'Ativo', color: 'text-success', bgColor: 'bg-green-100' },
    ativo: { label: 'Ativo', color: 'text-success', bgColor: 'bg-green-100' },
    Finalizado: { label: 'Finalizado', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    finalizado: { label: 'Finalizado', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    Cancelado: { label: 'Cancelado', color: 'text-danger', bgColor: 'bg-red-100' },
    cancelado: { label: 'Cancelado', color: 'text-danger', bgColor: 'bg-red-100' },
    Pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
    pendente: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-yellow-100' },
  }
  const defaultStatus = { label: 'N/A', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  // Auto-fill km_saida when vehicle changes
  const handleVeiculoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vid = e.target.value
    setFormData((prev) => ({ ...prev, veiculo_id: vid }))
    const veiculo = veiculos.find((v: any) => v.id?.toString() === vid)
    if (veiculo) {
      setFormData((prev) => ({ ...prev, veiculo_id: vid, km_saida: veiculo.km_atual?.toString() || '0' }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de contratos de locação</p>
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Devolução</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor/Dia</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contratosLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Carregando...</td>
              </tr>
            ) : contratos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Nenhum contrato encontrado</td>
              </tr>
            ) : (
              contratos.map((contrato: any) => {
                const status = statusConfig[contrato.status] || defaultStatus
                return (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-primary">#{contrato.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {clientes.find((c: any) => c.id === contrato.cliente_id)?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {(() => {
                        const v = veiculos.find((v: any) => v.id === contrato.veiculo_id)
                        return v ? `${v.marca} ${v.modelo} (${v.placa})` : 'N/A'
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {contrato.data_saida ? format(new Date(contrato.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {contrato.data_prevista_devolucao ? format(new Date(contrato.data_prevista_devolucao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {contrato.valor_diaria?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      R$ {contrato.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePrintContract(contrato.id)}
                          disabled={isPrinting === contrato.id?.toString()}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Emitir Contrato"
                        >
                          {isPrinting === contrato.id?.toString() ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        </button>
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
                        {(contrato.status === 'Ativo' || contrato.status === 'ativo') && (
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

      {/* Modal - Formulário Completo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Contrato' : 'Novo Contrato de Locação'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Seção: Dados da Locação */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h3 className="text-sm font-bold text-blue-800 mb-3">DADOS DA LOCAÇÃO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                <select name="cliente_id" value={formData.cliente_id} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome} - {c.cpf_cnpj}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Veículo *</label>
                <select name="veiculo_id" value={formData.veiculo_id} onChange={handleVeiculoChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">Selecione um veículo</option>
                  {veiculos.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa}) - {v.status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção: Datas e Quilometragem */}
          <div className="bg-green-50 p-3 rounded-lg">
            <h3 className="text-sm font-bold text-green-800 mb-3">DATAS E QUILOMETRAGEM</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Saída *</label>
                <input type="date" name="data_saida" value={formData.data_saida} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hora Saída</label>
                <input type="time" name="hora_saida" value={formData.hora_saida} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Devolução Prevista *</label>
                <input type="date" name="data_prevista_devolucao" value={formData.data_prevista_devolucao} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">KM Saída</label>
                <input type="number" name="km_saida" value={formData.km_saida} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">KM Livres/Dia</label>
                <input type="number" name="km_livres_dia" value={formData.km_livres_dia} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Combustível Saída</label>
                <select name="combustivel_saida" value={formData.combustivel_saida} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="1/1">Cheio (1/1)</option>
                  <option value="3/4">3/4</option>
                  <option value="1/2">1/2</option>
                  <option value="1/4">1/4</option>
                  <option value="Reserva">Reserva</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção: Valores */}
          <div className="bg-yellow-50 p-3 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-800 mb-3">VALORES</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Qtd. Diárias *</label>
                <input type="number" name="quantidade_diarias" value={formData.quantidade_diarias} onChange={handleInputChange} required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor Diária (R$) *</label>
                <input type="number" name="valor_diaria" value={formData.valor_diaria} onChange={handleInputChange} required step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hora Extra (R$)</label>
                <input type="number" name="valor_hora_extra" value={formData.valor_hora_extra} onChange={handleInputChange} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">KM Excedente (R$)</label>
                <input type="number" name="valor_km_excedente" value={formData.valor_km_excedente} onChange={handleInputChange} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-2 p-2 bg-white rounded text-sm">
              <strong>Sub-Total:</strong> R$ {((parseInt(formData.quantidade_diarias) || 0) * (parseFloat(formData.valor_diaria) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Seção: Cartão de Crédito */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <h3 className="text-sm font-bold text-purple-800 mb-3">CARTÃO DE CRÉDITO (Opcional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select name="cartao_tipo" value={formData.cartao_tipo} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">Nenhum</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Elo">Elo</option>
                  <option value="Amex">Amex</option>
                  <option value="Hipercard">Hipercard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número</label>
                <input type="text" name="cartao_numero" value={formData.cartao_numero} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
                <input type="text" name="cartao_codigo" value={formData.cartao_codigo} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pré-Autorização</label>
                <input type="text" name="cartao_preaut" value={formData.cartao_preaut} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Validade</label>
                <input type="text" name="cartao_validade" value={formData.cartao_validade} onChange={handleInputChange} placeholder="MM/AA" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input type="number" name="cartao_valor" value={formData.cartao_valor} onChange={handleInputChange} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary" />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Contrato'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Contratos
