import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MigrateDataDialogProps {
  open: boolean
  scheduleCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function MigrateDataDialog({
  open,
  scheduleCount,
  onConfirm,
  onCancel,
}: MigrateDataDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>기존 데이터를 계정으로 이동하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            익명으로 작성하신 {scheduleCount}개의 스케줄이 있습니다.
            <br />
            <br />
            로그인한 계정으로 데이터를 이동하면 언제든지 다시 로그인하여 데이터에
            접근할 수 있습니다.
            <br />
            <br />
            <strong>주의:</strong> 이동하지 않고 새로 시작하면 기존 익명 데이터는
            더 이상 사용할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            새로 시작 (기존 데이터 삭제)
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            데이터 이동
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
