import { QueryClientProvider } from '@tanstack/react-query'
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
import { useSchedules } from '@/features/schedule/hooks/useSchedules'
import { useSyncTags, useTags } from '@/features/schedule/hooks/useTags'
import { useState, useMemo, useEffect } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { useAuthStore } from '@/stores/useAuthStore'
import axios from 'axios'
import { toast } from 'sonner'

function AppContent() {
  const [parserOpen, setParserOpen] = useState(false)
  const [folderSyncOpen, setFolderSyncOpen] = useState(false)
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const { testPanelVisible, fontSize, dateRangeFilter, sortBy } = useSettingsStore()
  const { data: schedules = [] } = useSchedules()
  const { data: tags = [] } = useTags()
  const syncTags = useSyncTags()
  const { user, login, updateNaverToken } = useAuthStore()
  const [showLanding, setShowLanding] = useState(() => {
    // 로그인되어 있지 않고, skipLanding 플래그가 없으면 랜딩 페이지 표시
    return !user && !localStorage.getItem('skipLanding')
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

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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
            naverAccessToken: response.data.access_token,
            naverRefreshToken: response.data.refresh_token
          }

          login(user)
          sessionStorage.removeItem('naver_state')
          toast.success(`환영합니다, ${user.name}님!`)

          // 홈으로 리다이렉트
          window.history.replaceState({}, '', '/')
          window.location.reload()
        } catch (error) {
          console.error('네이버 로그인 실패:', error)
          toast.error('네이버 로그인에 실패했습니다')
          window.history.replaceState({}, '', '/')
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
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const response = await axios.post(`${apiUrl}/auth/kakao`, {
            code
          })

          const user = {
            id: response.data.id,
            email: response.data.email,
            name: response.data.name,
            picture: response.data.picture,
            isAdmin: response.data.is_admin || false
          }

          login(user)
          toast.success(`환영합니다, ${user.name}님!`)

          // 홈으로 리다이렉트
          window.history.replaceState({}, '', '/')
          window.location.reload()
        } catch (error) {
          console.error('카카오 로그인 실패:', error)
          toast.error('카카오 로그인에 실패했습니다')
          window.history.replaceState({}, '', '/')
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

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const response = await axios.post(`${apiUrl}/auth/naver`, {
            code,
            state
          })

          // 로그인이 아닌 토큰만 저장
          updateNaverToken(response.data.access_token, response.data.refresh_token)
          sessionStorage.removeItem('naver_calendar_state')
          toast.success('네이버 캘린더 연동이 완료되었습니다')

          // 홈으로 리다이렉트
          window.history.replaceState({}, '', '/')
          window.location.reload()
        } catch (error) {
          console.error('네이버 캘린더 연동 실패:', error)
          toast.error('네이버 캘린더 연동에 실패했습니다')
          window.history.replaceState({}, '', '/')
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

  // 익명으로 계속하기 핸들러
  const handleContinueAnonymous = () => {
    localStorage.setItem('skipLanding', 'true')
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
          schedule.groom?.toLowerCase().includes(searchLower) ||
          schedule.bride?.toLowerCase().includes(searchLower) ||
          schedule.brand?.toLowerCase().includes(searchLower) ||
          schedule.album?.toLowerCase().includes(searchLower) ||
          schedule.photographer?.toLowerCase().includes(searchLower) ||
          schedule.manager?.toLowerCase().includes(searchLower) ||
          schedule.memo?.toLowerCase().includes(searchLower) ||
          schedule.folderName?.toLowerCase().includes(searchLower) ||
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
      >
        {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
        <section className="px-2 sm:px-4 pb-4 sm:pb-6 pt-4 sm:pt-6">
          <ScheduleTable
            data={filteredSchedules}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
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

      <Toaster position="top-right" />
      {testPanelVisible && <DialogTestPanel />}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!googleClientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not defined')
  }

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId || ''}>
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
