import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

export type DateRangePreset =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'lastWeek'
  | 'lastMonth'
  | 'lastYear'
  | 'nextWeek'
  | 'nextMonth'
  | 'nextYear'
  | 'all'
  | 'custom'
  | null

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
  [key: string]: boolean  // index signature for TanStack Table compatibility
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
  dateRangeFilter: { preset: DateRangePreset; from: Date | null; to: Date | null }
  setDateRangeFilter: (range: { preset?: DateRangePreset; from: Date | null; to: Date | null }) => void

  // 캘린더 연동 설정
  enabledCalendars: { google: boolean; naver: boolean }
  setEnabledCalendars: (calendars: { google: boolean; naver: boolean }) => void

  // 확인 다이얼로그 설정
  skipNaverCalendarConfirm: boolean
  setSkipNaverCalendarConfirm: (skip: boolean) => void

  // 정렬 설정
  sortBy: 'date-desc' | 'date-asc' | 'location-asc' | 'location-desc' | 'cuts-desc' | 'cuts-asc'
  setSortBy: (sort: 'date-desc' | 'date-asc' | 'location-asc' | 'location-desc' | 'cuts-desc' | 'cuts-asc') => void

  // 주 시작 요일 (0: 일요일, 1: 월요일)
  weekStartsOn: 0 | 1
  setWeekStartsOn: (day: 0 | 1) => void

  // 설정 사이드바 접힘 여부
  settingsSidebarCollapsed: boolean
  setSettingsSidebarCollapsed: (collapsed: boolean) => void

  // 날짜 범위 필터 버튼 접힘 여부
  dateRangeCollapsed: boolean
  setDateRangeCollapsed: (collapsed: boolean) => void

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
      testPanelVisible: false,
      viewMode: 'card',
      // 리스트뷰 컬럼 가시성
      listColumnVisibility: {
        select: false,
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
        select: false,
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
      dateRangeFilter: { preset: null, from: null, to: null },
      enabledCalendars: { google: true, naver: true },
      skipNaverCalendarConfirm: false,
      sortBy: 'date-desc',
      weekStartsOn: 1, // 기본값: 월요일
      settingsSidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 640, // 모바일에서는 접힘
      dateRangeCollapsed: true, // 기본값: 접힌 상태

      // Actions
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setTestPanelVisible: (visible) => set({ testPanelVisible: visible }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setListColumnVisibility: (visibility) =>
        set((state) => ({
          listColumnVisibility: { ...state.listColumnVisibility, ...visibility } as ColumnVisibility
        })),
      setCardColumnVisibility: (visibility) =>
        set((state) => ({
          cardColumnVisibility: { ...state.cardColumnVisibility, ...visibility } as ColumnVisibility
        })),
      setColumnLabel: (columnId, label) =>
        set((state) => ({
          columnLabels: { ...state.columnLabels, [columnId]: label }
        })),
      setDateRangeFilter: (range) =>
        set((state) => ({
          dateRangeFilter: {
            preset: range.preset !== undefined ? range.preset : state.dateRangeFilter.preset,
            from: range.from,
            to: range.to,
          }
        })),
      setEnabledCalendars: (calendars) => set({ enabledCalendars: calendars }),
      setSkipNaverCalendarConfirm: (skip) => set({ skipNaverCalendarConfirm: skip }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setWeekStartsOn: (day) => set({ weekStartsOn: day }),
      setSettingsSidebarCollapsed: (collapsed) => set({ settingsSidebarCollapsed: collapsed }),
      setDateRangeCollapsed: (collapsed) => set({ dateRangeCollapsed: collapsed }),
    }),
    {
      name: 'app-settings', // localStorage key
    }
  )
)
