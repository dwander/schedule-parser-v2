import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Schedule } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface ImportantMemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: Schedule
}

export function ImportantMemoDialog({ open, onOpenChange, schedule }: ImportantMemoDialogProps) {
  const updateSchedule = useUpdateSchedule()
  const [memo, setMemo] = useState('')

  // 다이얼로그 열릴 때 기존 데이터 로드
  useEffect(() => {
    if (open) {
      setMemo(schedule.photoNote?.importantMemo || '')
    }
  }, [open, schedule.photoNote?.importantMemo])

  const handleSave = () => {
    updateSchedule.mutate(
      {
        id: schedule.id,
        photoNote: {
          ...schedule.photoNote,
          importantMemo: memo.trim() || undefined
        }
      },
      {
        onSuccess: () => {
          toast.success('중요내용이 저장되었습니다')
          onOpenChange(false)
        },
        onError: () => {
          toast.error('저장에 실패했습니다')
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">중요 메모</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {schedule.location} · {schedule.couple}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 신랑측 가족사진 추가 요청, 특정 포즈 금지, 알러지 정보 등"
              className="min-h-[200px] resize-none"
              autoFocus
            />
            <div className="text-xs text-muted-foreground text-right">
              {memo.length}자
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={updateSchedule.isPending}
          >
            {updateSchedule.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
