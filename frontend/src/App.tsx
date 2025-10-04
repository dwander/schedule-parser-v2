import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/api/queryClient'
import { ScheduleTable } from './features/schedule/components/ScheduleTable'
import { ParserInput } from './features/parser/components/ParserInput'
import { ParsedDataPreview } from './features/parser/components/ParsedDataPreview'
import { Toaster } from '@/components/ui/sonner'
import { DialogTestPanel } from '@/components/dev/DialogTestPanel'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useState } from 'react'

function App() {
  const [parsedData, setParsedData] = useState<any[]>([])
  const { testPanelVisible, setTestPanelVisible } = useSettingsStore()

  const handleParsed = (data: any[]) => {
    console.log('파싱된 데이터:', data)
    setParsedData(data)
  }

  const handleSaved = () => {
    setParsedData([])
    // TanStack Query will automatically refetch the schedules
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppLayout
          stats={{
            scheduleCount: 42,
            totalCuts: 1234,
            totalPrice: 5678900
          }}
        >
          {/* 파서 입력창 */}
          <section className="mb-6 container max-w-screen-2xl px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="mb-4 text-base sm:text-lg font-semibold text-card-foreground">
                카카오톡 메시지 파싱
              </h2>
              <ParserInput onParsed={handleParsed} />
              <ParsedDataPreview parsedData={parsedData} onSaved={handleSaved} />
            </div>
          </section>

          {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
          <section className="px-2 sm:px-4 pb-4 sm:pb-6">
            <ScheduleTable />
          </section>
        </AppLayout>

        <Toaster position="top-right" />
        {testPanelVisible && <DialogTestPanel />}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
