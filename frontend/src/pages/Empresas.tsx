import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { empresasAPI } from '../services/api'
import { Plus, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react'

interface Empresa {
  id: string
  nome: string
  cnpj: string
  telefone: string
  email: string
  endereco: string
  cidade: string
  estado: string
  veiculosCount: number
}

const Empresas: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: empresasData, isLoading } = useQuery({
    queryKey: ['empresas', searchTerm],
    queryFn: () =>
      empresasAPI.list({
        search: searchTerm,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const empresas: Empresa[] = empresasData?.data || []

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta empresa?')) {
      console.log('Deletar empresa:', id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de empresas cadastradas</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
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
          empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="h-24 bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold text-white truncate px-4">{empresa.nome}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">CNPJ</p>
                  <p className="font-mono font-bold">{empresa.cnpj}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone size={16} className="text-primary" />
                    {empresa.telefone}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 break-all">
                    <Mail size={16} className="text-primary flex-shrink-0" />
                    {empresa.email}
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p>{empresa.endereco}</p>
                      <p>{empresa.cidade}, {empresa.estado}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{empresa.veiculosCount}</span> veículos
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button className="flex-1 px-3 py-2 text-primary hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
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
    </div>
  )
}

export default Empresas
