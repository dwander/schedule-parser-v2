import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Trash2, RotateCcw, X } from 'lucide-react'
import { useTrashSchedules, useRestoreSchedule, usePermanentDeleteSchedule, useEmptyTrash } from '../hooks/useSchedules'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Schedule } from '../types/schedule'

interface TrashDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const { data: trashSchedules = [], isLoading } = useTrashSchedules()
  const restoreMutation = useRestoreSchedule()
  const permanentDeleteMutation = usePermanentDeleteSchedule()
  const emptyTrashMutation = useEmptyTrash()

  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<number | null>(null)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)

  const handleRestore = (schedule: Schedule) => {
    restoreMutation.mutate(String(schedule.id), {
      onSuccess: () => {
        toast.success(`"${schedule.couple}"를 복구했습니다`)
      },
      onError: (error) => {
        toast.error('복구 실패: ' + (error as Error).message)
      }
    })
  }

  const handlePermanentDelete = (scheduleId: number) => {
    permanentDeleteMutation.mutate(String(scheduleId), {
      onSuccess: () => {
        toast.success('영구 삭제되었습니다')
        setConfirmPermanentDelete(null)
      },
      onError: (error) => {
        toast.error('삭제 실패: ' + (error as Error).message)
      }
    })
  }

  const handleEmptyTrash = () => {
    emptyTrashMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`휴지통을 비웠습니다 (${data.deleted_count}개 항목 삭제)`)
        setConfirmEmptyTrash(false)
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error('휴지통 비우기 실패: ' + (error as Error).message)
      }
    })
  }

  const formatDeletedDate = (deletedAt: string | null) => {
    if (!deletedAt) return ''

    const date = new Date(deletedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘 삭제됨'
    if (diffDays === 1) return '어제 삭제됨'
    if (diffDays < 7) return `${diffDays}일 전 삭제됨`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전 삭제됨`
    return `${Math.floor(diffDays / 30)}개월 전 삭제됨`
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              휴지통
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" text="불러오는 중..." />
              </div>
            ) : trashSchedules.length === 0 ? (
              <EmptyState
                icon={Trash2}
                title="휴지통이 비어있습니다"
                description="삭제된 스케줄이 없습니다"
              />
            ) : (
              <div className="space-y-3">
                {trashSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {schedule.location} - {schedule.couple}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {schedule.date} {schedule.time} • {formatDeletedDate(schedule.deletedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(schedule)}
                        disabled={restoreMutation.isPending}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        복구
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmPermanentDelete(schedule.id)}
                        disabled={permanentDeleteMutation.isPending}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        영구삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {trashSchedules.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                총 {trashSchedules.length}개 항목
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmEmptyTrash(true)}
                disabled={emptyTrashMutation.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                휴지통 비우기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 영구 삭제 확인 */}
      <ConfirmDialog
        open={confirmPermanentDelete !== null}
        onOpenChange={(open) => !open && setConfirmPermanentDelete(null)}
        title="영구 삭제"
        description="이 스케줄을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="영구 삭제"
        onConfirm={() => confirmPermanentDelete && handlePermanentDelete(confirmPermanentDelete)}
        variant="destructive"
      />

      {/* 휴지통 비우기 확인 */}
      <ConfirmDialog
        open={confirmEmptyTrash}
        onOpenChange={setConfirmEmptyTrash}
        title="휴지통 비우기"
        description={`휴지통의 모든 항목(${trashSchedules.length}개)을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="모두 삭제"
        onConfirm={handleEmptyTrash}
        variant="destructive"
      />
    </>
  )
}
