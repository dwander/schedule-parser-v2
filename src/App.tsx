import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/api/queryClient'
import { ScheduleTable } from './features/schedule/components/ScheduleTable'
import { ParserInput } from './features/parser/components/ParserInput'
import { ParsedDataPreview } from './features/parser/components/ParsedDataPreview'
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
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-foreground">
            본식스냅러
          </h1>

          {/* 파서 입력창 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">카카오톡 메시지 파싱</h2>
            <ParserInput onParsed={handleParsed} />
            <ParsedDataPreview parsedData={parsedData} onSaved={handleSaved} />
          </div>

          {/* 스케줄 테이블 */}
          <ScheduleTable />
        </div>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
