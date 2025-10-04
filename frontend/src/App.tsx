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

function AppContent() {
  const [parserOpen, setParserOpen] = useState(false)
  const [folderSyncOpen, setFolderSyncOpen] = useState(false)
  const { testPanelVisible, fontSize } = useSettingsStore()
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

  // 실제 통계 계산
  const stats = useMemo(() => {
    if (!schedules || schedules.length === 0) {
      return {
        scheduleCount: 0,
        totalCuts: 0,
        totalPrice: 0
      }
    }

    return {
      scheduleCount: schedules.length,
      totalCuts: schedules.reduce((sum, s) => sum + (s.cuts || 0), 0),
      totalPrice: schedules.reduce((sum, s) => sum + (s.price || 0), 0)
    }
  }, [schedules])

  return (
    <>
      <AppLayout
        stats={stats}
        onAddClick={() => setParserOpen(true)}
        onFolderSyncClick={() => setFolderSyncOpen(true)}
      >
        {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
        <section className="px-2 sm:px-4 pb-4 sm:pb-6 pt-4 sm:pt-6">
          <ScheduleTable />
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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
