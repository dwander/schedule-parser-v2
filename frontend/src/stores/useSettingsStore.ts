import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

export interface ColumnVisibility {
  select: boolean
  date: boolean
  location: boolean
  time: boolean
  couple: boolean
  contact: boolean
  brand: boolean
  album: boolean
  photographer: boolean
  cuts: boolean
  price: boolean
  manager: boolean
  memo: boolean
  folderName: boolean
}

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

  // 테이블 컬럼 가시성
  columnVisibility: ColumnVisibility
  setColumnVisibility: (visibility: Partial<ColumnVisibility> | ColumnVisibility) => void

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
      columnVisibility: {
        select: true,
        date: true,
        location: true,
        time: true,
        couple: true,
        contact: true,
        brand: true,
        album: true,
        photographer: true,
        cuts: true,
        price: true,
        manager: true,
        memo: true,
        folderName: true,
      },

      // Actions
      setTheme: (theme) => set({ theme }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setTestPanelVisible: (visible) => set({ testPanelVisible: visible }),
      setColumnVisibility: (visibility) =>
        set((state) => ({
          columnVisibility: { ...state.columnVisibility, ...visibility }
        })),
    }),
    {
      name: 'app-settings', // localStorage key
    }
  )
)
