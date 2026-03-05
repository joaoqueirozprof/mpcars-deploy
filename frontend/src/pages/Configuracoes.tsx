import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Save, Eye, EyeOff } from 'lucide-react'

const Configuracoes: React.FC = () => {
  const { user, logout } = useAuth()
  const [formData, setFormData] = useState({
    nome: user?.name || '',
    email: user?.email || '',
    senhaAtual: '',
    novaSenha: '',
    confirmaSenha: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (formData.novaSenha && formData.novaSenha !== formData.confirmaSenha) {
        setMessage({ type: 'error', text: 'As senhas não coincidem' })
        return
      }

      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' })
      setFormData((prev) => ({
        ...prev,
        senhaAtual: '',
        novaSenha: '',
        confirmaSenha: '',
      }))
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar configurações' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie as configurações da sua conta</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Conta</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Usuário</p>
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Email</p>
            <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Cargo</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Atualizar Perfil</h2>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-success border border-green-200'
                : 'bg-red-50 text-danger border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Alterar Senha</h3>

            {/* Password Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    name="senhaAtual"
                    value={formData.senhaAtual}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  >
                    {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    name="novaSenha"
                    value={formData.novaSenha}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    name="confirmaSenha"
                    value={formData.confirmaSenha}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Deixe os campos de senha em branco se não deseja alterar a senha
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Logout Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-danger mb-2">Sair da Conta</h2>
        <p className="text-gray-600 mb-4">
          Você será desconectado do sistema e redirecionado para a página de login.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2 bg-danger hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Sair Agora
        </button>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Versão MPCARS</span>
            <span className="font-semibold text-gray-900">v2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Navegador</span>
            <span className="font-semibold text-gray-900">{navigator.userAgent.split(' ').pop()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plataforma</span>
            <span className="font-semibold text-gray-900">{navigator.platform}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuracoes
