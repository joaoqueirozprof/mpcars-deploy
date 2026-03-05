import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientesAPI } from '../services/api'
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  cpfCnpj: string
  telefone: string
  cidade: string
  cnhValidade: string
}

const Clientes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { data: clientesData, isLoading } = useQuery({
    queryKey: ['clientes', currentPage, searchTerm],
    queryFn: () =>
      clientesAPI.list({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const clientes: Cliente[] = clientesData?.data?.items || []
  const totalPages = clientesData?.data?.totalPages || 1

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este cliente?')) {
      // Call delete API
      console.log('Deletar cliente:', id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de clientes da locadora</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">CPF/CNPJ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cidade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">CNH Validade</th>
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
              clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cliente.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.cpfCnpj}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.telefone}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cliente.cidade}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        new Date(cliente.cnhValidade) > new Date()
                          ? 'bg-green-100 text-success'
                          : 'bg-red-100 text-danger'
                      }`}
                    >
                      {new Date(cliente.cnhValidade).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes
