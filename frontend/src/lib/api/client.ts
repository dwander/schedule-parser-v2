import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { AUTH_STORAGE_KEYS } from '@/lib/constants/storage'

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN)
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
      localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN)
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
