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

  // 글꼴 크기 (12px ~ 24px, 기본 16px) - html root font-size
  fontSize: number
  setFontSize: (size: number) => void

  // 가격 표시 모드
  priceMode: 'total' | 'net'
  setPriceMode: (mode: 'total' | 'net') => void

  // UI 테스트 패널 표시 여부
  testPanelVisible: boolean
  setTestPanelVisible: (visible: boolean) => void

  // 뷰 모드
  viewMode: 'list' | 'card'
  setViewMode: (mode: 'list' | 'card') => void

  // 리스트뷰 컬럼 가시성
  listColumnVisibility: ColumnVisibility
  setListColumnVisibility: (visibility: Partial<ColumnVisibility> | ColumnVisibility) => void

  // 카드뷰 컬럼 가시성
  cardColumnVisibility: ColumnVisibility
  setCardColumnVisibility: (visibility: Partial<ColumnVisibility> | ColumnVisibility) => void

  // 테이블 컬럼 라벨
  columnLabels: ColumnLabels
  setColumnLabel: (columnId: keyof ColumnLabels, label: string) => void

  // 날짜 범위 필터
  dateRangeFilter: { from: Date | null; to: Date | null }
  setDateRangeFilter: (range: { from: Date | null; to: Date | null }) => void

  // 캘린더 연동 설정
  enabledCalendars: { google: boolean; naver: boolean }
  setEnabledCalendars: (calendars: { google: boolean; naver: boolean }) => void

  // 확인 다이얼로그 설정
  skipNaverCalendarConfirm: boolean
  setSkipNaverCalendarConfirm: (skip: boolean) => void

  // 정렬 설정
  sortBy: 'date-desc' | 'date-asc' | 'location-asc' | 'location-desc' | 'cuts-desc' | 'cuts-asc'
  setSortBy: (sort: 'date-desc' | 'date-asc' | 'location-asc' | 'location-desc' | 'cuts-desc' | 'cuts-asc') => void

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
      fontSize: 16,
      priceMode: 'total',
      testPanelVisible: true,
      viewMode: 'list',
      // 리스트뷰 컬럼 가시성
      listColumnVisibility: {
        select: true,
        date: true,
        location: true,
        time: true,
        couple: true,
        contact: false,
        brand: true,
        album: true,
        photographer: false,
        cuts: true,
        price: true,
        manager: false,
        memo: true,
        folderName: true,
      },
      // 카드뷰 컬럼 가시성
      cardColumnVisibility: {
        select: true,
        date: true,
        location: true,
        time: true,
        couple: true,
        contact: true,
        brand: true,
        album: true,
        photographer: false,
        cuts: true,
        price: true,
        manager: false,
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
      dateRangeFilter: { from: null, to: null },
      enabledCalendars: { google: true, naver: true },
      skipNaverCalendarConfirm: false,
      sortBy: 'date-desc',

      // Actions
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setTestPanelVisible: (visible) => set({ testPanelVisible: visible }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setListColumnVisibility: (visibility) =>
        set((state) => ({
          listColumnVisibility: { ...state.listColumnVisibility, ...visibility }
        })),
      setCardColumnVisibility: (visibility) =>
        set((state) => ({
          cardColumnVisibility: { ...state.cardColumnVisibility, ...visibility }
        })),
      setColumnLabel: (columnId, label) =>
        set((state) => ({
          columnLabels: { ...state.columnLabels, [columnId]: label }
        })),
      setDateRangeFilter: (range) => set({ dateRangeFilter: range }),
      setEnabledCalendars: (calendars) => set({ enabledCalendars: calendars }),
      setSkipNaverCalendarConfirm: (skip) => set({ skipNaverCalendarConfirm: skip }),
      setSortBy: (sort) => set({ sortBy: sort }),
    }),
    {
      name: 'app-settings', // localStorage key
    }
  )
)
