import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Auth API calls
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// Clientes API calls
export const clientesAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/clientes', { params }),
  get: (id: string) => api.get(`/clientes/${id}`),
  create: (data: Record<string, any>) =>
    api.post('/clientes', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/clientes/${id}`, data),
  delete: (id: string) => api.delete(`/clientes/${id}`),
}

// Veículos API calls
export const veiculosAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/veiculos', { params }),
  get: (id: string) => api.get(`/veiculos/${id}`),
  create: (data: Record<string, any>) =>
    api.post('/veiculos', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/veiculos/${id}`, data),
  delete: (id: string) => api.delete(`/veiculos/${id}`),
}

// Contratos API calls
export const contratosAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/contratos', { params }),
  get: (id: string) => api.get(`/contratos/${id}`),
  create: (data: Record<string, any>) =>
    api.post('/contratos', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/contratos/${id}`, data),
  delete: (id: string) => api.delete(`/contratos/${id}`),
  finalize: (id: string, data: Record<string, any>) =>
    api.post(`/contratos/${id}/finalize`, data),
}

// Empresas API calls
export const empresasAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/empresas', { params }),
  get: (id: string) => api.get(`/empresas/${id}`),
  create: (data: Record<string, any>) =>
    api.post('/empresas', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/empresas/${id}`, data),
  delete: (id: string) => api.delete(`/empresas/${id}`),
}

// Dashboard API calls
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  charts: (period?: string) =>
    api.get('/dashboard/charts', { params: { period } }),
  alerts: () => api.get('/dashboard/alerts'),
}

// Financeiro API calls
export const financeiroAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/financeiro', { params }),
  get: (id: string) => api.get(`/financeiro/${id}`),
  create: (data: Record<string, any>) =>
    api.post('/financeiro', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/financeiro/${id}`, data),
  delete: (id: string) => api.delete(`/financeiro/${id}`),
}

export default api
