import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Save, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import api from '../services/api'

interface ConfigItem {
  chave: string
  valor: string
}

interface ConfigsState {
  [key: string]: string
}

interface EditState {
  [key: string]: boolean
}

interface EditValuesState {
  [key: string]: string
}

const Configuracoes: React.FC = () => {
  const { user, logout } = useAuth()
  const [configs, setConfigs] = useState<ConfigsState>({})
  const [editMode, setEditMode] = useState<EditState>({})
  const [editValues, setEditValues] = useState<EditValuesState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const empresaFields = [
    { key: 'empresa_nome', label: 'Nome da Empresa' },
    { key: 'empresa_subtitulo', label: 'Subtítulo' },
    { key: 'empresa_cnpj', label: 'CNPJ' },
    { key: 'empresa_telefone', label: 'Telefone' },
    { key: 'empresa_endereco', label: 'Endereço' },
    { key: 'empresa_cidade', label: 'Cidade' },
    { key: 'empresa_cep', label: 'CEP' },
  ]

  const valoresFields = [
    { key: 'valor_diaria_padrao', label: 'Valor da Diária Padrão (R$)', suffix: 'R$' },
    { key: 'valor_hora_extra_padrao', label: 'Valor da Hora Extra Padrão (R$)', suffix: 'R$' },
    { key: 'valor_km_excedente_padrao', label: 'Valor do KM Excedente Padrão (R$)', suffix: 'R$' },
    { key: 'km_livres_dia_padrao', label: 'KM Livres por Dia (KM)', suffix: 'KM' },
  ]

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/configuracoes/')
      const configArray = response.data.data || response.data || []

      const configMap: ConfigsState = {}
      if (Array.isArray(configArray)) {
        configArray.forEach((item: ConfigItem) => {
          configMap[item.chave] = item.valor
        })
      }

      setConfigs(configMap)
      setMessage(null)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar as configurações do sistema' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (key: string) => {
    setEditMode((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setEditValues((prev) => ({
      ...prev,
      [key]: configs[key] || '',
    }))
  }

  const handleInputChange = (key: string, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async (key: string) => {
    try {
      setSaving(key)
      setMessage(null)

      await api.put(`/configuracoes/${key}`, {
        valor: editValues[key],
      })

      setConfigs((prev) => ({
        ...prev,
        [key]: editValues[key],
      }))

      setEditMode((prev) => ({
        ...prev,
        [key]: false,
      }))

      setMessage({ type: 'success', text: `${key} atualizado com sucesso!` })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      setMessage({ type: 'error', text: `Erro ao atualizar ${key}` })
    } finally {
      setSaving(null)
    }
  }

  const renderConfigField = (field: { key: string; label: string; suffix?: string }) => {
    const isEditing = editMode[field.key]
    const value = configs[field.key] || ''
    const displayValue = editValues[field.key] !== undefined ? editValues[field.key] : value

    return (
      <div key={field.key} className="flex items-center justify-between py-3 px-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{field.label}</p>
          {isEditing ? (
            <input
              type="text"
              value={displayValue}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
          ) : (
            <p className="text-sm text-gray-900 font-semibold mt-1">
              {value || 'Não configurado'} {field.suffix && !isEditing && value && <span className="text-xs text-gray-600 ml-1">{field.suffix}</span>}
            </p>
          )}
        </div>
        <div className="ml-4">
          {isEditing ? (
            <button
              onClick={() => handleSave(field.key)}
              disabled={saving === field.key}
              className="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === field.key ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Salvar
            </button>
          ) : (
            <button
              onClick={() => handleEditClick(field.key)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600 mt-1">Gerencie as configurações globais do MPCARS</p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Dados da Empresa Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Dados da Empresa</h2>
          <p className="text-sm text-gray-600 mt-1">Informações principais da sua empresa de locação</p>
        </div>
        <div>
          {empresaFields.map((field) => renderConfigField(field))}
        </div>
      </div>

      {/* Valores Padrão Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Valores Padrão</h2>
          <p className="text-sm text-gray-600 mt-1">Valores padrão para cálculos de contratos e reservas</p>
        </div>
        <div>
          {valoresFields.map((field) => renderConfigField(field))}
        </div>
      </div>

      {/* Informações do Sistema Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Informações do Sistema</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Versão MPCARS</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">v2.0.0</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Usuário Logado</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Função</p>
              <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{user?.role || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Sair da Conta</h2>
        <p className="text-red-800 mb-4">Você será desconectado do sistema e redirecionado para a página de login.</p>
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Sair Agora
        </button>
      </div>
    </div>
  )
}

export default Configuracoes
