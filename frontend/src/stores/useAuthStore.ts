import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
}

interface AuthState {
  user: User | null
  isLoggedIn: boolean

  // Actions
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 기본값
      user: null,
      isLoggedIn: false,

      // Actions
      login: (user) => set({ user, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
