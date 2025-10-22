import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logger } from '@/lib/utils/logger'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  isAdmin?: boolean
  hasSeenSampleData?: boolean
  naverAccessToken?: string
  naverRefreshToken?: string
  googleAccessToken?: string
  googleRefreshToken?: string
}

interface AuthState {
  user: User | null
  isLoggedIn: boolean

  // Actions
  login: (user: User) => void
  logout: () => void
  updateNaverToken: (accessToken: string, refreshToken: string) => void
  removeNaverToken: () => void
  updateGoogleToken: (accessToken: string, refreshToken: string) => void
  removeGoogleToken: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 기본값
      user: null,
      isLoggedIn: false,

      // Actions
      login: (user) => set({ user, isLoggedIn: true }),
      logout: async () => {
        // 서비스워커 캐시 클리어
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys()
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            )
            logger.log('Service Worker 캐시가 클리어되었습니다')
          } catch (error) {
            logger.error('캐시 클리어 실패:', error)
          }
        }

        set({ user: null, isLoggedIn: false })
      },
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
      updateGoogleToken: (accessToken, refreshToken) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, googleAccessToken: accessToken, googleRefreshToken: refreshToken }
            : null,
        })),
      removeGoogleToken: () =>
        set((state) => ({
          user: state.user
            ? { ...state.user, googleAccessToken: undefined, googleRefreshToken: undefined }
            : null,
        })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
