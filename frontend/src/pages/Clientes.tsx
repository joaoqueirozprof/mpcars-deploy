import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientesAPI } from '../services/api'
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '../components/Modal'

interface Cliente {
  id: string
  nome: string
  cpf_cnpj: string
  email?: string
  telefone?: string
  cnh?: string
  cnh_validade?: string
  endereco_residencial?: string
  cidade?: string
  estado?: string
  cep_residencial?: string
}

interface FormData {
  nome: string
  cpf_cnpj: string
  email?: string
  telefone?: string
  cnh?: string
  cnh_validade?: string
  endereco_residencial?: string
  cidade?: string
  estado?: string
  cep_residencial?: string
}

const Clientes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cnh: '',
    cnh_validade: '',
    endereco_residencial: '',
    cidade: '',
    estado: '',
    cep_residencial: '',
  })

  const queryClient = useQueryClient()

  const { data: clientesResponse, isLoading } = useQuery({
    queryKey: ['clientes', searchTerm],
    queryFn: async () => {
      const response = await clientesAPI.list({ search: searchTerm })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => clientesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => clientesAPI.update(editingId || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })

  const clientes: Cliente[] = clientesResponse?.items || []

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      cnh: '',
      cnh_validade: '',
      endereco_residencial: '',
      cidade: '',
      estado: '',
      cep_residencial: '',
    })
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (cliente: any) => {
    setFormData({
      nome: cliente.nome || '',
      cpf_cnpj: cliente.cpf_cnpj || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cnh: cliente.cnh || '',
      cnh_validade: cliente.cnh_validade || '',
      endereco_residencial: cliente.endereco_residencial || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep_residencial: cliente.cep_residencial || '',
    })
    setEditingId(cliente.id)
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
    if (confirm('Tem certeza que deseja deletar este cliente?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isCNHValid = (date: string) => {
    if (!date) return false
    return new Date(date) > new Date()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de clientes da locadora</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome, email ou CPF/CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">CPF/CNPJ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">CNH Válidade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cidade</th>
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
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              clientes.map((cliente: any) => (
                <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cliente.nome}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{cliente.cpf_cnpj}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.telefone || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {cliente.cnh_validade ? (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isCNHValid(cliente.cnh_validade)
                            ? 'bg-green-100 text-success'
                            : 'bg-red-100 text-danger'
                        }`}
                      >
                        {format(new Date(cliente.cnh_validade), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.cidade || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(cliente)}
                        className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
              <input
                type="text"
                name="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNH</label>
              <input
                type="text"
                name="cnh"
                value={formData.cnh}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNH Válidade</label>
              <input
                type="date"
                name="cnh_validade"
                value={formData.cnh_validade}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Residencial</label>
            <input
              type="text"
              name="endereco_residencial"
              value={formData.endereco_residencial}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                type="text"
                name="cep_residencial"
                value={formData.cep_residencial}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="00000-000"
              />
            </div>
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

export default Clientes
