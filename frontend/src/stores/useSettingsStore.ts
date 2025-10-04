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

export interface ColumnLabels {
  date: string
  location: string
  time: string
  couple: string
  contact: string
  brand: string
  album: string
  photographer: string
  cuts: string
  price: string
  manager: string
  memo: string
  folderName: string
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

  // 뷰 모드
  viewMode: 'list' | 'card'
  setViewMode: (mode: 'list' | 'card') => void

  // 테이블 컬럼 가시성
  columnVisibility: ColumnVisibility
  setColumnVisibility: (visibility: Partial<ColumnVisibility> | ColumnVisibility) => void

  // 테이블 컬럼 라벨
  columnLabels: ColumnLabels
  setColumnLabel: (columnId: keyof ColumnLabels, label: string) => void

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
      viewMode: 'list',
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
      columnLabels: {
        date: '날짜',
        location: '장소',
        time: '시간',
        couple: '신랑신부',
        contact: '연락처',
        brand: '브랜드',
        album: '앨범',
        photographer: '작가',
        cuts: '컷수',
        price: '촬영비',
        manager: '계약자',
        memo: '전달사항',
        folderName: '폴더',
      },

      // Actions
      setTheme: (theme) => set({ theme }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setTestPanelVisible: (visible) => set({ testPanelVisible: visible }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setColumnVisibility: (visibility) =>
        set((state) => ({
          columnVisibility: { ...state.columnVisibility, ...visibility }
        })),
      setColumnLabel: (columnId, label) =>
        set((state) => ({
          columnLabels: { ...state.columnLabels, [columnId]: label }
        })),
    }),
    {
      name: 'app-settings', // localStorage key
    }
  )
)
