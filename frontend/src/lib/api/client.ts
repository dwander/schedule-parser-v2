import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear auth
      localStorage.removeItem('auth-token')
      localStorage.removeItem('auth-user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
