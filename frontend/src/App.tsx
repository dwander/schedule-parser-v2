import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/api/queryClient'
import { ScheduleTable } from './features/schedule/components/ScheduleTable'
import { ParserModal } from './features/parser/components/ParserModal'
import { FolderSyncModal } from './features/sync/components/FolderSyncModal'
import { Toaster } from '@/components/ui/sonner'
import { DialogTestPanel } from '@/components/dev/DialogTestPanel'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSchedules } from '@/features/schedule/hooks/useSchedules'
import { useSyncTags, useTags } from '@/features/schedule/hooks/useTags'
import { useState, useMemo, useEffect } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

function AppContent() {
  const [parserOpen, setParserOpen] = useState(false)
  const [folderSyncOpen, setFolderSyncOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const { testPanelVisible, fontSize, dateRangeFilter } = useSettingsStore()
  const { data: schedules = [] } = useSchedules()
  const { data: tags = [] } = useTags()
  const syncTags = useSyncTags()

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

  // 필터링된 스케줄 계산 (날짜 범위 + 전역 검색)
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

    return filtered
  }, [schedules, dateRangeFilter, globalFilter])

  // 필터링된 데이터로 통계 계산
  const stats = useMemo(() => {
    return {
      scheduleCount: filteredSchedules.length,
      totalCuts: filteredSchedules.reduce((sum, s) => sum + (s.cuts || 0), 0),
      totalPrice: filteredSchedules.reduce((sum, s) => sum + (s.price || 0), 0)
    }
  }, [filteredSchedules])

  return (
    <>
      <AppLayout
        stats={stats}
        onAddClick={() => setParserOpen(true)}
        onFolderSyncClick={() => setFolderSyncOpen(true)}
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

      <Toaster position="top-right" />
      {testPanelVisible && <DialogTestPanel />}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

function App() {
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
