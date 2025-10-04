import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  // 테마
  theme: Theme
  setTheme: (theme: Theme) => void

  // 가격 표시 모드
  priceMode: 'total' | 'net'
  setPriceMode: (mode: 'total' | 'net') => void

  // UI 테스트 패널 표시 여부
  testPanelVisible: boolean
  setTestPanelVisible: (visible: boolean) => void

  // 추후 추가될 설정들...
  // language: 'ko' | 'en'
  // notifications: boolean
  // tablePageSize: number
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // 기본값
      theme: 'system',
      priceMode: 'total',
      testPanelVisible: true,

      // Actions
      setTheme: (theme) => set({ theme }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setTestPanelVisible: (visible) => set({ testPanelVisible: visible }),
    }),
    {
      name: 'app-settings', // localStorage key
    }
  )
)
