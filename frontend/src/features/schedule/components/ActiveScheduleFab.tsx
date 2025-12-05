import { useState } from 'react'
import { AlarmClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Schedule } from '../types/schedule'
import { PhotoSequenceDialog } from './PhotoSequenceDialog'

interface ActiveScheduleFabProps {
  schedule: Schedule
}

/**
 * 현재 진행 중인 스케줄의 포토시퀀스 모달로 진입할 수 있는 플로팅 버튼
 *
 * 뷰포트 우측 하단에 고정되어 표시됩니다.
 * ScrollButtons와 겹치지 않도록 위치가 조정되어 있습니다.
 */
export function ActiveScheduleFab({ schedule }: ActiveScheduleFabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // 커플명에서 첫 번째 이름만 추출 (예: "김철수 ♥ 이영희" -> "김철수")
  const displayName = schedule.couple?.split(/[♥❤️&,\/]/)?.[0]?.trim() || '진행 중'

  return (
    <>
      {/* 플로팅 버튼 - ScrollButtons 위에 위치 */}
      <div className="fixed bottom-32 right-6 z-50">
        <Button
          onClick={() => setDialogOpen(true)}
          className={cn(
            'h-auto min-h-12 px-4 py-2 rounded-full',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 hover:scale-105 hover:animate-none',
            'transition-all duration-200',
            'flex items-center gap-2',
            'animate-fab-pulse'
          )}
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, var(--fab-shadow-opacity)), 0 2px 6px rgba(0, 0, 0, var(--fab-shadow-opacity)), inset 0 0 0 1.5px rgba(255, 255, 255, var(--fab-border-opacity))'
          }}
          aria-label="포토시퀀스 열기"
        >
          <AlarmClock className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col items-start text-left">
            <span className="text-xs opacity-80">{schedule.time}</span>
            <span className="text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
          </div>
        </Button>
      </div>

      {/* 포토시퀀스 다이얼로그 */}
      <PhotoSequenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={schedule}
      />
    </>
  )
}
