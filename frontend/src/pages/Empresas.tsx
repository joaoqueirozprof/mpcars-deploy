import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empresasAPI } from '../services/api'
import { Plus, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react'
import Modal from '../components/Modal'

interface Empresa {
  id: string
  nome: string
  razao_social: string
  cnpj: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
  responsavel: string
  ativa: boolean
}

interface FormData {
  nome: string
  razao_social: string
  cnpj: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
  responsavel: string
  ativa: boolean
}

const Empresas: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    razao_social: '',
    cnpj: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: 'RN',
    cep: '',
    telefone: '',
    email: '',
    responsavel: '',
    ativa: true,
  })

  const queryClient = useQueryClient()

  const { data: empresasResponse, isLoading } = useQuery({
    queryKey: ['empresas', searchTerm],
    queryFn: async () => {
      const response = await empresasAPI.list({ search: searchTerm })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => empresasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => empresasAPI.update(editingId || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setIsModalOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => empresasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
    },
  })

  const empresas: Empresa[] = empresasResponse?.items || []

  const resetForm = () => {
    setFormData({
      nome: '',
      razao_social: '',
      cnpj: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: 'RN',
      cep: '',
      telefone: '',
      email: '',
      responsavel: '',
      ativa: true,
    })
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (empresa: any) => {
    setFormData({
      nome: empresa.nome || '',
      razao_social: empresa.razao_social || '',
      cnpj: empresa.cnpj || '',
      endereco: empresa.endereco || '',
      numero: empresa.numero || '',
      bairro: empresa.bairro || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || 'RN',
      cep: empresa.cep || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      responsavel: empresa.responsavel || '',
      ativa: empresa.ativa !== undefined ? empresa.ativa : true,
    })
    setEditingId(empresa.id)
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
    if (confirm('Tem certeza que deseja deletar esta empresa?')) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de empresas cadastradas</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Empresa
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Carregando...
          </div>
        ) : empresas.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhuma empresa encontrada
          </div>
        ) : (
          empresas.map((empresa: any) => (
            <div
              key={empresa.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="h-24 bg-gradient-to-r from-primary to-blue-700 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold text-white truncate px-4">{empresa.nome}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Razão Social</p>
                  <p className="text-xs text-gray-700">{empresa.razao_social}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 font-semibold">CNPJ</p>
                  <p className="font-mono font-bold text-sm">{empresa.cnpj}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 break-all">
                    <Phone size={16} className="text-primary flex-shrink-0" />
                    <span className="text-xs">{empresa.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 break-all">
                    <Mail size={16} className="text-primary flex-shrink-0" />
                    <span className="text-xs">{empresa.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{empresa.cidade}, {empresa.estado}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => openEditModal(empresa)}
                    className="flex-1 px-3 py-2 text-primary hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(empresa.id)}
                    className="flex-1 px-3 py-2 text-danger hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={16} />
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Empresa' : 'Nova Empresa'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
              <input
                type="text"
                name="razao_social"
                value={formData.razao_social}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleInputChange}
                required
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <input
                type="text"
                name="responsavel"
                value={formData.responsavel}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleInputChange}
                required
                placeholder="00000-000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
                required
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
                required
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="ativa"
                checked={formData.ativa}
                onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                className="rounded border-gray-300 focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Empresa Ativa</span>
            </label>
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

export default Empresas
