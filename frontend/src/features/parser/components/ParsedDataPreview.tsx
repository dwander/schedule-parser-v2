import { Button } from '@/components/ui/button'
import { useBatchAddSchedules } from '@/features/schedule/hooks/useSchedules'
import { convertParsedDataToSchedules } from '../utils/convertParsedData'
import { toast } from 'sonner'

interface ParsedDataPreviewProps {
  parsedData: any[]
  onSaved: () => void
}

export function ParsedDataPreview({ parsedData, onSaved }: ParsedDataPreviewProps) {
  const batchAddSchedules = useBatchAddSchedules()

  const handleSaveAll = () => {
    const schedules = convertParsedDataToSchedules(parsedData)

    batchAddSchedules.mutate(schedules, {
      onSuccess: () => {
        toast.success(`${schedules.length}개의 스케줄이 저장되었습니다.`)
        onSaved()
      },
      onError: (error) => {
        toast.error('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
      }
    })
  }

  if (parsedData.length === 0) {
    return null
  }

  const schedules = convertParsedDataToSchedules(parsedData)

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">파싱 결과: {schedules.length}개 스케줄</p>
        <Button
          onClick={handleSaveAll}
          disabled={batchAddSchedules.isPending}
        >
          {batchAddSchedules.isPending ? '저장 중...' : '모두 저장'}
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">날짜</th>
                <th className="px-4 py-2 text-left">시간</th>
                <th className="px-4 py-2 text-left">신랑신부</th>
                <th className="px-4 py-2 text-left">장소</th>
                <th className="px-4 py-2 text-left">브랜드</th>
                <th className="px-4 py-2 text-left">컷수</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule, index) => (
                <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{schedule.date}</td>
                  <td className="px-4 py-2">{schedule.time}</td>
                  <td className="px-4 py-2">{schedule.couple}</td>
                  <td className="px-4 py-2">{schedule.location}</td>
                  <td className="px-4 py-2">{schedule.brand}</td>
                  <td className="px-4 py-2">{schedule.cuts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
