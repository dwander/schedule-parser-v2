import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
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
import { useActiveSchedule } from '@/features/schedule/hooks/useActiveSchedule'
import { ActiveScheduleFab } from '@/features/schedule/components/ActiveScheduleFab'
import { useSyncTags, useTags } from '@/features/schedule/hooks/useTags'
import { useUiSettings } from '@/features/auth/hooks/useUsers'
import { useSettingsSync } from '@/features/settings/hooks/useUserSettings'
import { useState, useMemo, useEffect } from 'react'
import { EXAMPLE_SCHEDULES } from '@/features/schedule/constants/exampleSchedules'
import { markSampleDataSeen } from '@/lib/api/sampleData'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ScrollButtons } from '@/components/common/ScrollButtons'
import { APP_STORAGE_KEYS } from '@/lib/constants/storage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { fetchConfig } from '@/lib/api/config'
import { toast } from 'sonner'
import {
  getCallbackRoute,
  handleOAuthCallback,
  extractCallbackParams,
  OAuthCallbackError,
} from '@/features/auth/utils/oauthCallbacks'
import { getProviderName } from '@/features/auth/utils/oauthProviders'
import { enableStrictDateParsing } from '@/lib/utils/safariDatePolyfill'
import { calculateDateRangeFromPreset } from '@/lib/utils/datePresets'
import { logger } from '@/lib/utils/logger'

function AppContent() {
  // 개발 환경에서 Safari처럼 엄격한 날짜 파싱 활성화
  useEffect(() => {
    if (import.meta.env.DEV) {
      enableStrictDateParsing()
    }
  }, [])

  // 사용자 설정 동기화 (DB ↔ Zustand)
  useSettingsSync()

  const [parserOpen, setParserOpen] = useState(false)
  const [folderSyncOpen, setFolderSyncOpen] = useState(false)
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedCount, setSelectedCount] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [refreshTimestamp, setRefreshTimestamp] = useState(() => new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { testPanelVisible, fontSize, dateRangeFilter, sortBy, weekStartsOn, setColumnLabel } = useSettingsStore()
  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules()
  const { data: tags = [] } = useTags()
  const syncTags = useSyncTags()
  const batchAddSchedules = useBatchAddSchedules()
  const { user, login, updateNaverToken, updateGoogleToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: uiSettings } = useUiSettings(user?.id)
  const [showLanding, setShowLanding] = useState(() => {
    // 로그인되어 있지 않고, skipLanding 플래그가 없으면 랜딩 페이지 표시
    return !user && !localStorage.getItem(APP_STORAGE_KEYS.SKIP_LANDING)
  })

  // 통합 OAuth 콜백 처리 (Google, Naver, Kakao)
  useEffect(() => {
    const handleOAuthCallbacks = async () => {
      const pathname = window.location.pathname
      const searchParams = new URLSearchParams(window.location.search)
      const { code, state } = extractCallbackParams(searchParams)

      // OAuth 콜백 경로인지 확인
      const callbackRoute = getCallbackRoute(pathname)
      if (!callbackRoute || !code) return

      const { provider, mode } = callbackRoute

      // 중복 실행 방지: 즉시 URL에서 code/state 제거
      window.history.replaceState({}, '', '/')

      try {
        // 통합 콜백 처리
        const data = await handleOAuthCallback({
          provider,
          mode,
          code,
          state: state || undefined,
        })

        if (mode === 'calendar') {
          // 캘린더 연동 모드: 토큰만 저장
          if (provider === 'naver') {
            updateNaverToken(data.access_token!, data.refresh_token!)
            toast.success('네이버 캘린더 연동이 완료되었습니다')
          } else if (provider === 'google') {
            updateGoogleToken(data.access_token!, data.refresh_token!)
            toast.success('구글 캘린더 연동이 완료되었습니다')
          }
        } else {
          // 로그인 모드: 사용자 정보 저장
          const user = {
            id: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture,
            isAdmin: data.is_admin || false,
            hasSeenSampleData: data.has_seen_sample_data || false,
            // 네이버 로그인 시 토큰 포함
            ...(provider === 'naver' && {
              naverAccessToken: data.access_token,
              naverRefreshToken: data.refresh_token,
            }),
            // 구글 로그인 시 토큰 포함
            ...(provider === 'google' && {
              googleAccessToken: data.access_token,
              googleRefreshToken: data.refresh_token,
            }),
          }

          login(user)

          // localStorage 업데이트가 완료된 후 쿼리 무효화
          // setTimeout을 사용하여 다음 틱에서 실행
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] })
            queryClient.invalidateQueries({ queryKey: ['tags'] })
          }, 0)

          toast.success(`환영합니다, ${user.name}님!`)
        }
      } catch (error) {
        if (error instanceof OAuthCallbackError) {
          toast.error(error.message)
        } else {
          const providerName = getProviderName(provider)
          const action = mode === 'calendar' ? '캘린더 연동' : '로그인'
          toast.error(`${providerName} ${action}에 실패했습니다`)
        }
      }
    }

    handleOAuthCallbacks()
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

  // DB에서 UI 설정(columnLabels) 불러와서 Zustand store에 적용
  useEffect(() => {
    if (uiSettings && uiSettings.columnLabels) {
      // DB에서 불러온 columnLabels를 store에 적용
      Object.entries(uiSettings.columnLabels).forEach(([key, value]) => {
        if (typeof value === 'string') {
          setColumnLabel(key as any, value)
        }
      })
    }
  }, [uiSettings, setColumnLabel])

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
            logger.error('예제 데이터 표시 기록 실패:', error)
          }
        } else {
          // 익명 사용자: localStorage에 기록
          localStorage.setItem(APP_STORAGE_KEYS.HAS_SEEN_EXAMPLES, 'true')
        }

        toast.success('🎉 환영합니다! 예제 데이터가 추가되었습니다.')
      },
      onError: (error) => {
        logger.error('예제 데이터 추가 실패:', error)
        localStorage.removeItem(APP_STORAGE_KEYS.ADDING_EXAMPLES) // 실패 시 플래그 제거
      }
    })
  }, [schedulesLoading, schedules, user])

  // 익명으로 계속하기 핸들러
  const handleContinueAnonymous = () => {
    localStorage.setItem(APP_STORAGE_KEYS.SKIP_LANDING, 'true')
    setShowLanding(false)
  }

  // 필터링 강제 갱신 핸들러
  const handleRefresh = () => {
    setIsRefreshing(true)
    setRefreshTimestamp(new Date())

    // 300ms 후 로딩 상태 해제 (사용자 피드백)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 300)
  }

  // 필터링된 스케줄 계산 (날짜 범위 + 전역 검색 + 정렬)
  const filteredSchedules = useMemo(() => {
    let filtered = schedules

    // 날짜 범위 필터 - 프리셋 기반 동적 계산
    if (dateRangeFilter.preset && dateRangeFilter.preset !== 'all') {
      // 프리셋이 있으면 현재 시간 기준으로 동적 계산
      const range = calculateDateRangeFromPreset(dateRangeFilter.preset, weekStartsOn)

      if (range) {
        const fromDate = range.from
        const toDate = range.to

        // 'upcoming' 프리셋일 때는 시간도 고려
        if (dateRangeFilter.preset === 'upcoming') {
          const now = refreshTimestamp
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          filtered = filtered.filter((schedule) => {
            if (!schedule.date) return false
            const [year, month, day] = schedule.date.split('.').map(Number)
            const scheduleDate = new Date(year, month - 1, day)

            // 날짜가 범위를 벗어나면 제외
            if (scheduleDate < fromDate || scheduleDate > toDate) return false

            // 오늘 이후 스케줄은 무조건 포함
            if (scheduleDate > today) return true

            // 오늘 스케줄은 시간 체크
            if (scheduleDate.getTime() === today.getTime()) {
              if (!schedule.time) return true // 시간 정보 없으면 포함

              // 촬영 시간 파싱 (HH:MM 형식)
              const [hours, minutes] = schedule.time.split(':').map(Number)
              if (isNaN(hours) || isNaN(minutes)) return true // 파싱 실패 시 포함

              // 촬영 종료 시간 = 촬영 시작 시간 + 1시간
              const scheduleEndTime = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                hours + 1, // 1시간 후
                minutes
              )

              // 현재 시간이 촬영 종료 시간 이전이면 포함
              return now < scheduleEndTime
            }

            // 과거 날짜는 제외
            return false
          })
        } else {
          // 다른 프리셋은 날짜만 체크
          filtered = filtered.filter((schedule) => {
            if (!schedule.date) return false
            const [year, month, day] = schedule.date.split('.').map(Number)
            const scheduleDate = new Date(year, month - 1, day)
            return scheduleDate >= fromDate && scheduleDate <= toDate
          })
        }
      }
    } else if (dateRangeFilter.from && dateRangeFilter.to) {
      // 프리셋이 없으면 저장된 날짜 사용 (custom 모드)
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
  }, [schedules, dateRangeFilter, globalFilter, sortBy, weekStartsOn, refreshTimestamp])

  // 현재 진행 중인 스케줄 감지 (필터링된 스케줄 기준)
  const activeSchedule = useActiveSchedule(filteredSchedules)

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
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      >
        {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
        <section className="px-2 sm:px-4 pb-4 sm:pb-6 pt-4 sm:pt-6">
          <ScheduleTable
            data={filteredSchedules}
            activeScheduleId={activeSchedule?.id}
            onSelectedCountChange={setSelectedCount}
            deleteDialogOpen={deleteDialogOpen}
            onDeleteDialogChange={setDeleteDialogOpen}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
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

      {/* 진행 중인 스케줄 플로팅 버튼 */}
      {activeSchedule && <ActiveScheduleFab schedule={activeSchedule} />}

      {/* 스크롤 버튼 */}
      <ScrollButtons />
    </>
  )
}

function App() {
  const { isLoaded, setConfig } = useConfigStore()

  // 앱 시작 시 Backend에서 설정 가져오기
  useEffect(() => {
    fetchConfig()
      .then((config) => {
        setConfig(config)
      })
      .catch((error) => {
        logger.error('Failed to load config:', error)
        toast.error('설정을 불러오는데 실패했습니다.')
      })
  }, [setConfig])

  // Config 로딩 중
  if (!isLoaded) {
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
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
