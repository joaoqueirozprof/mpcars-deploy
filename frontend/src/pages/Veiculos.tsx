import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { veiculosAPI } from '../services/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface Veiculo {
  id: string
  marca: string
  modelo: string
  placa: string
  ano: number
  status: 'disponivel' | 'alugado' | 'manutencao'
  km: number
  empresa: string
}

type StatusFilter = 'todos' | 'disponivel' | 'alugado' | 'manutencao'

const Veiculos: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')

  const { data: veiculosData, isLoading } = useQuery({
    queryKey: ['veiculos', statusFilter],
    queryFn: () =>
      veiculosAPI.list({
        status: statusFilter === 'todos' ? undefined : statusFilter,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const veiculos: Veiculo[] = veiculosData?.data || []

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    disponivel: {
      label: 'Disponível',
      color: 'text-success',
      bgColor: 'bg-green-100',
    },
    alugado: {
      label: 'Alugado',
      color: 'text-primary',
      bgColor: 'bg-blue-100',
    },
    manutencao: {
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

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este veículo?')) {
      console.log('Deletar veículo:', id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-600 mt-1">Gestão da frota de veículos</p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
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
                      <p className="font-semibold">{veiculo.km.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="text-sm font-medium">{veiculo.empresa}</p>
                  </div>

                  <div className="pt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button className="flex-1 px-3 py-2 text-primary hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
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
    </div>
  )
}

export default Veiculos
