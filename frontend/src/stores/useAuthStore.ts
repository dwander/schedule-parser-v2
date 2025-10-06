import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  isAdmin?: boolean
  naverAccessToken?: string
  naverRefreshToken?: string
}

interface AuthState {
  user: User | null
  isLoggedIn: boolean

  // Actions
  login: (user: User) => void
  logout: () => void
  updateNaverToken: (accessToken: string, refreshToken: string) => void
  removeNaverToken: () => void
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
      updateNaverToken: (accessToken, refreshToken) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, naverAccessToken: accessToken, naverRefreshToken: refreshToken }
            : null,
        })),
      removeNaverToken: () =>
        set((state) => ({
          user: state.user
            ? { ...state.user, naverAccessToken: undefined, naverRefreshToken: undefined }
            : null,
        })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
