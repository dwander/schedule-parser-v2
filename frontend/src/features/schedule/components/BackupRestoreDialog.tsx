import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Upload, FileJson, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { exportBackup, parseBackupFile, validateBackupData, type BackupData } from '../utils/backup'
import { useSchedules, useBatchAddSchedules } from '../hooks/useSchedules'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { getAnonymousUserId } from '@/lib/utils/anonymousUser'

interface BackupRestoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BackupRestoreDialog({ open, onOpenChange }: BackupRestoreDialogProps) {
  const { data: schedules = [] } = useSchedules()
  const batchAddSchedules = useBatchAddSchedules()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [backupData, setBackupData] = useState<BackupData | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // 백업 (내보내기)
  const handleExport = () => {
    try {
      const userId = getAnonymousUserId()
      exportBackup(schedules, userId)
      toast.success(`${schedules.length}개의 스케줄을 백업했습니다.`)
    } catch (error) {
      toast.error('백업 실패: ' + (error as Error).message)
    }
  }

  // 파일 선택
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  // 파일 읽기 및 검증
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 확장자 검증
    if (!file.name.endsWith('.json')) {
      toast.error('JSON 파일만 업로드 가능합니다.')
      return
    }

    setIsProcessing(true)

    try {
      const data = await parseBackupFile(file)
      const validation = validateBackupData(data, schedules)

      if (!validation.valid) {
        toast.error('백업 파일에 오류가 있습니다:\n' + validation.errors.join('\n'))
        setIsProcessing(false)
        return
      }

      // 백업 데이터 저장 및 확인 다이얼로그 표시
      setBackupData(data)
      setConfirmDialogOpen(true)
      setIsProcessing(false)

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error('파일 읽기 실패: ' + (error as Error).message)
      setIsProcessing(false)
    }
  }

  // 복원 실행 (배치 API 사용)
  const handleRestore = async () => {
    if (!backupData) return

    setIsProcessing(true)
    setConfirmDialogOpen(false)

    try {
      // 기존 ID와 중복되지 않는 스케줄만 필터링
      const existingIds = new Set(schedules.map(s => s.id))
      const newSchedules = backupData.schedules
        .filter(schedule => !existingIds.has(schedule.id))
        .map(schedule => {
          // id, createdAt, updatedAt 제외
          const { id, createdAt, updatedAt, ...scheduleData } = schedule
          return {
            ...scheduleData,
            isDuplicate: scheduleData.isDuplicate || false
          }
        })

      if (newSchedules.length === 0) {
        toast.info('복원할 새로운 스케줄이 없습니다.')
        setBackupData(null)
        onOpenChange(false)
        setIsProcessing(false)
        return
      }

      // 배치 API로 한 번에 생성
      await batchAddSchedules.mutateAsync(newSchedules)

      const duplicateCount = backupData.schedules.length - newSchedules.length
      if (duplicateCount > 0) {
        toast.success(
          `${newSchedules.length}개의 스케줄을 복원했습니다.\n(중복 ${duplicateCount}개 건너뜀)`
        )
      } else {
        toast.success(`${newSchedules.length}개의 스케줄을 성공적으로 복원했습니다.`)
      }

      setBackupData(null)
      onOpenChange(false)
    } catch (error) {
      toast.error('복원 실패: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const validation = backupData ? validateBackupData(backupData, schedules) : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>데이터 백업 및 복원</DialogTitle>
            <DialogDescription>
              스케줄 데이터를 JSON 파일로 백업하거나 복원할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 백업 (내보내기) */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4" />
                데이터 백업
              </h4>
              <p className="text-sm text-muted-foreground">
                현재 저장된 {schedules.length}개의 스케줄을 JSON 파일로 백업합니다.
              </p>
              <Button
                onClick={handleExport}
                disabled={schedules.length === 0}
                className="w-full"
                variant="outline"
              >
                <FileJson className="h-4 w-4 mr-2" />
                백업 파일 다운로드
              </Button>
            </div>

            <div className="border-t border-border" />

            {/* 복원 (가져오기) */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                데이터 복원
              </h4>
              <p className="text-sm text-muted-foreground">
                백업 파일에서 스케줄 데이터를 복원합니다.
              </p>
              <Button
                onClick={handleFileSelect}
                disabled={isProcessing}
                className="w-full"
                variant="outline"
              >
                {isProcessing ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                백업 파일 선택
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* 경고 메시지 */}
            <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800 dark:text-yellow-200">
                복원 시 중복된 스케줄은 건너뛰고, 새로운 스케줄만 추가됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 복원 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleRestore}
        title="데이터 복원"
        description={
          validation
            ? `백업 파일: ${backupData?.version || 'unknown'}\n백업 날짜: ${backupData?.backup_date ? new Date(backupData.backup_date).toLocaleString('ko-KR') : 'unknown'}\n\n새로운 스케줄: ${validation.newSchedules}개\n중복 건너뛰기: ${validation.duplicates}개\n\n복원하시겠습니까?`
            : ''
        }
        confirmText="복원"
        cancelText="취소"
      />
    </>
  )
}
