import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/api/queryClient'
import { ScheduleTable } from './features/schedule/components/ScheduleTable'
import { ParserInput } from './features/parser/components/ParserInput'
import { ParsedDataPreview } from './features/parser/components/ParsedDataPreview'
import { Toaster } from '@/components/ui/sonner'
import { DialogTestPanel } from '@/components/dev/DialogTestPanel'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { useState } from 'react'

function App() {
  const [parsedData, setParsedData] = useState<any[]>([])

  const handleParsed = (data: any[]) => {
    console.log('파싱된 데이터:', data)
    setParsedData(data)
  }

  const handleSaved = () => {
    setParsedData([])
    // TanStack Query will automatically refetch the schedules
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main className="py-6">
          {/* 파서 입력창 */}
          <section className="mb-6 container max-w-screen-2xl px-8">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-card-foreground">
                카카오톡 메시지 파싱
              </h2>
              <ParserInput onParsed={handleParsed} />
              <ParsedDataPreview parsedData={parsedData} onSaved={handleSaved} />
            </div>
          </section>

          {/* 스케줄 테이블 - 100% 뷰포트 폭 사용 */}
          <section className="px-4">
            <ScheduleTable />
          </section>
        </main>
      </div>
        <Toaster position="top-right" />
        <DialogTestPanel />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
