import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { FormDialog } from '@/components/common/FormDialog'
import { toast } from 'sonner'

export function DialogTestPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-card border border-border rounded-lg shadow-lg space-y-2">
      <div className="text-sm font-semibold text-muted-foreground mb-2">
        UI 테스트 패널
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => toast.success('토스트 테스트!')}
      >
        토스트
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setAlertOpen(true)}
      >
        알림 모달
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
      >
        확인 모달
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setFormOpen(true)}
      >
        폼 모달
      </Button>

      {/* Alert Dialog */}
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="알림"
        description="이것은 단순 알림 다이얼로그입니다."
        onConfirm={() => toast.info('알림 확인!')}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="정말 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
        onConfirm={() => {
          toast.success('삭제되었습니다!')
          setConfirmOpen(false)
        }}
      />

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="정보 입력"
        description="이름을 입력해주세요."
        confirmText="저장"
        cancelText="취소"
        onConfirm={() => {
          toast.success(`${name || '이름없음'}님 저장 완료!`)
          setFormOpen(false)
          setName('')
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
          />
        </div>
      </FormDialog>
    </div>
  )
}
