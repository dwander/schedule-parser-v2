import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { queryClient } from './lib/api/queryClient'
import { ScheduleTable } from './features/schedule/components/ScheduleTable'
import { ParserModal } from './features/parser/components/ParserModal'
import { FolderSyncModal } from './features/sync/components/FolderSyncModal'
import { BackupRestoreDialog } from './features/schedule/components/BackupRestoreDialog'
import { Toaster } from '@/components/ui/sonner'
import { DialogTestPanel } from '@/components/dev/DialogTestPanel'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/components/landing/LandingPage'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSchedules, useBatchAddSchedules } from '@/features/schedule/hooks/useSchedules'
import { useSyncTags, useTags } from '@/features/schedule/hooks/useTags'
import { useState, useMemo, useEffect } from 'react'
import { EXAMPLE_SCHEDULES } from '@/features/schedule/constants/exampleSchedules'
import { markSampleDataSeen } from '@/lib/api/sampleData'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { getApiUrl } from '@/lib/constants/api'
import { APP_STORAGE_KEYS } from '@/lib/constants/storage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { fetchConfig } from '@/lib/api/config'
import axios from 'axios'
import { toast } from 'sonner'

function AppContent() {
  const [parserOpen, setParserOpen] = useState(false)
  const [folderSyncOpen, setFolderSyncOpen] = useState(false)
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedCount, setSelectedCount] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { testPanelVisible, fontSize, dateRangeFilter, sortBy } = useSettingsStore()
  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules()
  const { data: tags = [] } = useTags()
  const syncTags = useSyncTags()
  const batchAddSchedules = useBatchAddSchedules()
  const { user, login, updateNaverToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [showLanding, setShowLanding] = useState(() => {
    // 로그인되어 있지 않고, skipLanding 플래그가 없으면 랜딩 페이지 표시
    return !user && !localStorage.getItem(APP_STORAGE_KEYS.SKIP_LANDING)
  })

  // 네이버 로그인 callback 처리
  useEffect(() => {
    const handleNaverCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const path = window.location.pathname

      if (path === '/auth/naver/callback' && code && state) {
        const savedState = sessionStorage.getItem('naver_state')

        if (state !== savedState) {
          toast.error('인증 오류: state가 일치하지 않습니다')
          window.history.replaceState({}, '', '/')
          return
        }

        // 중복 실행 방지: 즉시 URL에서 code/state 제거
        window.history.replaceState({}, '', '/')
        sessionStorage.removeItem('naver_state')

        try {
          const apiUrl = getApiUrl()
          const response = await axios.post(`${apiUrl}/auth/naver`, {
            code,
            state
          })

          const user = {
            id: response.data.id,
            email: response.data.email,
            name: response.data.name,
            picture: response.data.picture,
            isAdmin: response.data.is_admin || false,
            hasSeenSampleData: response.data.has_seen_sample_data || false,
            naverAccessToken: response.data.access_token,
            naverRefreshToken: response.data.refresh_token
          }

          login(user)
          queryClient.invalidateQueries({ queryKey: ['schedules'] })
          queryClient.invalidateQueries({ queryKey: ['tags'] })
          toast.success(`환영합니다, ${user.name}님!`)
        } catch (error) {
          console.error('네이버 로그인 실패:', error)
          toast.error('네이버 로그인에 실패했습니다')
        }
      }
    }

    handleNaverCallback()
  }, [])

  // 카카오 로그인 callback 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const path = window.location.pathname

      if (path === '/auth/kakao/callback' && code) {
        // 중복 실행 방지: 즉시 URL에서 code 제거
        window.history.replaceState({}, '', '/')

        try {
          const apiUrl = getApiUrl()
          const response = await axios.post(`${apiUrl}/auth/kakao`, {
            code
          })

          const user = {
            id: response.data.id,
            email: response.data.email,
            name: response.data.name,
            picture: response.data.picture,
            isAdmin: response.data.is_admin || false,
            hasSeenSampleData: response.data.has_seen_sample_data || false
          }

          login(user)
          queryClient.invalidateQueries({ queryKey: ['schedules'] })
          queryClient.invalidateQueries({ queryKey: ['tags'] })
          toast.success(`환영합니다, ${user.name}님!`)
        } catch (error) {
          console.error('카카오 로그인 실패:', error)
          toast.error('카카오 로그인에 실패했습니다')
        }
      }
    }

    handleKakaoCallback()
  }, [])

  // 네이버 캘린더 연동 callback 처리
  useEffect(() => {
    const handleNaverCalendarCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const path = window.location.pathname

      if (path === '/auth/naver/calendar/callback' && code && state) {
        const savedState = sessionStorage.getItem('naver_calendar_state')

        if (state !== savedState) {
          toast.error('인증 오류: state가 일치하지 않습니다')
          window.history.replaceState({}, '', '/')
          return
        }

        // 중복 실행 방지: 즉시 URL에서 code/state 제거
        window.history.replaceState({}, '', '/')
        sessionStorage.removeItem('naver_calendar_state')

        try {
          const apiUrl = getApiUrl()
          const response = await axios.post(`${apiUrl}/auth/naver`, {
            code,
            state
          })

          // 로그인이 아닌 토큰만 저장
          updateNaverToken(response.data.access_token, response.data.refresh_token)
          toast.success('네이버 캘린더 연동이 완료되었습니다')
        } catch (error) {
          console.error('네이버 캘린더 연동 실패:', error)
          toast.error('네이버 캘린더 연동에 실패했습니다')
        }
      }
    }

    handleNaverCalendarCallback()
  }, [])

  // 로그인 시 랜딩 페이지 숨기기
  useEffect(() => {
    if (user) {
      setShowLanding(false)
    }
  }, [user])

  // fontSize를 html 루트에 적용 (모든 rem 단위에 영향)
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  // 초기 로드 시 태그가 없으면 스케줄에서 동기화
  useEffect(() => {
    if (schedules && schedules.length > 0 && tags.length === 0) {
      syncTags.mutate()
    }
  }, [schedules, tags])

  // 앱을 처음 사용하는 경우 예제 데이터 추가
  useEffect(() => {
    const addingFlag = localStorage.getItem(APP_STORAGE_KEYS.ADDING_EXAMPLES)

    // 현재 추가 중이면 스킵
    if (addingFlag === 'true') {
      return
    }

    // 로딩 중이거나 이미 스케줄이 있으면 스킵
    if (schedulesLoading || schedules.length > 0) {
      return
    }

    // 예제 데이터를 본 적이 있는지 확인
    // 로그인 사용자: user.hasSeenSampleData 확인
    // 익명 사용자: localStorage 확인
    const hasSeenExamples = user
      ? user.hasSeenSampleData
      : localStorage.getItem(APP_STORAGE_KEYS.HAS_SEEN_EXAMPLES) === 'true'

    if (hasSeenExamples) {
      return
    }

    localStorage.setItem(APP_STORAGE_KEYS.ADDING_EXAMPLES, 'true') // 추가 중 플래그 설정

    // 예제 데이터 추가
    batchAddSchedules.mutate(EXAMPLE_SCHEDULES, {
      onSuccess: async () => {
        localStorage.removeItem(APP_STORAGE_KEYS.ADDING_EXAMPLES) // 추가 완료, 플래그 제거

        // 로그인 사용자: 백엔드에 기록
        if (user) {
          try {
            await markSampleDataSeen(user.id)
            // 사용자 정보 업데이트 (hasSeenSampleData = true)
            login({ ...user, hasSeenSampleData: true })
          } catch (error) {
            console.error('예제 데이터 표시 기록 실패:', error)
          }
        } else {
          // 익명 사용자: localStorage에 기록
          localStorage.setItem(APP_STORAGE_KEYS.HAS_SEEN_EXAMPLES, 'true')
        }

        toast.success('🎉 환영합니다! 예제 데이터가 추가되었습니다.')
      },
      onError: (error) => {
        console.error('예제 데이터 추가 실패:', error)
        localStorage.removeItem(APP_STORAGE_KEYS.ADDING_EXAMPLES) // 실패 시 플래그 제거
      }
    })
  }, [schedulesLoading, schedules, user])

  // 익명으로 계속하기 핸들러
  const handleContinueAnonymous = () => {
    localStorage.setItem(APP_STORAGE_KEYS.SKIP_LANDING, 'true')
    setShowLanding(false)
  }

  // 필터링된 스케줄 계산 (날짜 범위 + 전역 검색 + 정렬)
  const filteredSchedules = useMemo(() => {
    let filtered = schedules

    // 날짜 범위 필터
    if (dateRangeFilter.from && dateRangeFilter.to) {
      const fromDate = new Date(dateRangeFilter.from)
      const toDate = new Date(dateRangeFilter.to)

      filtered = filtered.filter((schedule) => {
        if (!schedule.date) return false
        const [year, month, day] = schedule.date.split('.').map(Number)
        const scheduleDate = new Date(year, month - 1, day)
        return scheduleDate >= fromDate && scheduleDate <= toDate
      })
    }

    // 전역 검색 필터 (모든 필드 검색)
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase()
      filtered = filtered.filter((schedule) => {
        return (
          schedule.date?.toLowerCase().includes(searchLower) ||
          schedule.time?.toLowerCase().includes(searchLower) ||
          schedule.location?.toLowerCase().includes(searchLower) ||
          schedule.couple?.toLowerCase().includes(searchLower) ||
          schedule.brand?.toLowerCase().includes(searchLower) ||
          schedule.album?.toLowerCase().includes(searchLower) ||
          schedule.photographer?.toLowerCase().includes(searchLower) ||
          schedule.manager?.toLowerCase().includes(searchLower) ||
          schedule.memo?.toLowerCase().includes(searchLower) ||
          schedule.contact?.toLowerCase().includes(searchLower) ||
          schedule.cuts?.toString().includes(searchLower) ||
          schedule.price?.toString().includes(searchLower)
        )
      })
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': {
          // 날짜+시간 최신순 (내림차순)
          const dateTimeA = `${a.date || ''} ${a.time || ''}`
          const dateTimeB = `${b.date || ''} ${b.time || ''}`
          return dateTimeB.localeCompare(dateTimeA)
        }
        case 'date-asc': {
          // 날짜+시간 오래된순 (오름차순)
          const dateTimeA = `${a.date || ''} ${a.time || ''}`
          const dateTimeB = `${b.date || ''} ${b.time || ''}`
          return dateTimeA.localeCompare(dateTimeB)
        }
        case 'location-asc':
          // 장소 오름차순 (A→Z)
          return (a.location || '').localeCompare(b.location || '', 'ko')
        case 'location-desc':
          // 장소 내림차순 (Z→A)
          return (b.location || '').localeCompare(a.location || '', 'ko')
        case 'cuts-desc':
          // 컷수 많은순 (내림차순)
          return (b.cuts || 0) - (a.cuts || 0)
        case 'cuts-asc':
          // 컷수 적은순 (오름차순)
          return (a.cuts || 0) - (b.cuts || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [schedules, dateRangeFilter, globalFilter, sortBy])

  // 필터링된 데이터로 통계 계산
  const stats = useMemo(() => {
    return {
      scheduleCount: filteredSchedules.length,
      totalCuts: filteredSchedules.reduce((sum, s) => sum + (s.cuts || 0), 0),
      totalPrice: filteredSchedules.reduce((sum, s) => sum + (s.price || 0), 0)
    }
  }, [filteredSchedules])

  // 랜딩 페이지 표시
  if (showLanding) {
    return <LandingPage onContinueAnonymous={handleContinueAnonymous} />
  }

  return (
    <>
      <AppLayout
        stats={stats}
        onAddClick={() => setParserOpen(true)}
        onFolderSyncClick={() => setFolderSyncOpen(true)}
        onBackupRestoreClick={() => setBackupRestoreOpen(true)}
        selectedCount={selectedCount}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      >
        {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
        <section className="px-2 sm:px-4 pb-4 sm:pb-6 pt-4 sm:pt-6">
          <ScheduleTable
            data={filteredSchedules}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onSelectedCountChange={setSelectedCount}
            deleteDialogOpen={deleteDialogOpen}
            onDeleteDialogChange={setDeleteDialogOpen}
          />
        </section>
      </AppLayout>

      {/* 파서 모달 */}
      <ParserModal
        open={parserOpen}
        onOpenChange={setParserOpen}
        existingSchedules={schedules}
      />

      {/* 폴더 동기화 모달 */}
      <FolderSyncModal
        open={folderSyncOpen}
        onOpenChange={setFolderSyncOpen}
      />

      {/* 백업 및 복원 다이얼로그 */}
      <BackupRestoreDialog
        open={backupRestoreOpen}
        onOpenChange={setBackupRestoreOpen}
      />

      <Toaster position="top-center" />
      {testPanelVisible && <DialogTestPanel />}
      <ReactQueryDevtools initialIsOpen={false} />

      {/* 버전 배지 - 오른쪽 하단 */}
      <div className="fixed bottom-0 right-4 z-50 px-2 py-1 bg-black/80 text-gray-400 text-xs rounded-md font-mono select-none pointer-events-none backdrop-blur-sm">
        v{import.meta.env.VITE_APP_VERSION || 'dev'}
      </div>
    </>
  )
}

function App() {
  const { config, isLoaded, setConfig } = useConfigStore()

  // 앱 시작 시 Backend에서 설정 가져오기
  useEffect(() => {
    fetchConfig()
      .then((config) => {
        setConfig(config)
      })
      .catch((error) => {
        console.error('Failed to load config:', error)
        toast.error('설정을 불러오는데 실패했습니다.')
      })
  }, [setConfig])

  // Config 로딩 중
  if (!isLoaded || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={config.google_client_id}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}

export default App
