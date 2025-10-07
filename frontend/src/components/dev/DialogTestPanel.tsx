import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { FormDialog } from '@/components/common/FormDialog'
import { Spinner } from '@/components/common/Spinner'
import { LoadingOverlay } from '@/components/common/LoadingOverlay'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { EmptyState } from '@/components/common/EmptyState'
import { FolderSyncModal } from '@/features/sync/components/FolderSyncModal'
import { PricingRuleDialog } from '@/features/pricing/components/PricingRuleDialog'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'

export function DialogTestPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [loadingOpen, setLoadingOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [emptyOpen, setEmptyOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [name, setName] = useState('')
  const { theme, setTheme } = useSettingsStore()

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    toast.success(`${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환`)
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-card border border-border rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-[340px]">
      <div className="text-sm font-semibold text-muted-foreground mb-3">
        UI 테스트 패널
      </div>

      {/* 테마 전환 (전체 너비) */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mb-3"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? (
          <>
            <Sun className="h-4 w-4 mr-2" />
            라이트 모드
          </>
        ) : (
          <>
            <Moon className="h-4 w-4 mr-2" />
            다크 모드
          </>
        )}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        {/* 좌측 컬럼 - 다이얼로그 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-1">다이얼로그</div>
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
        </div>

        {/* 우측 컬럼 - 상태 & 기능 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-1">상태 & 기능</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setLoadingOpen(true)}
          >
            로딩 상태
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setErrorOpen(true)}
          >
            에러 상태
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEmptyOpen(true)}
          >
            빈 상태
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setSyncOpen(true)}
          >
            폴더 동기화
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setPricingOpen(true)}
          >
            촬영비 계산
          </Button>
        </div>
      </div>

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

      {/* Loading State Dialog */}
      <AlertDialog
        open={loadingOpen}
        onOpenChange={setLoadingOpen}
        title="로딩 상태 예시"
        confirmText="닫기"
        onConfirm={() => setLoadingOpen(false)}
      >
        <LoadingOverlay message="데이터를 불러오는 중입니다..." />
      </AlertDialog>

      {/* Error State Dialog */}
      <AlertDialog
        open={errorOpen}
        onOpenChange={setErrorOpen}
        title="에러 상태 예시"
        confirmText="닫기"
        onConfirm={() => setErrorOpen(false)}
      >
        <ErrorMessage
          title="데이터 로드 실패"
          message="서버와의 연결에 실패했습니다."
          onRetry={() => {
            toast.info('재시도 중...')
            setErrorOpen(false)
          }}
        />
      </AlertDialog>

      {/* Empty State Dialog */}
      <AlertDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="빈 상태 예시"
        confirmText="닫기"
        onConfirm={() => setEmptyOpen(false)}
      >
        <EmptyState
          title="스케줄이 없습니다"
          description="새로운 스케줄을 추가해보세요."
          action={{
            label: '스케줄 추가',
            onClick: () => {
              toast.success('스케줄 추가 화면으로 이동!')
              setEmptyOpen(false)
            },
          }}
        />
      </AlertDialog>

      {/* Folder Sync Modal */}
      <FolderSyncModal open={syncOpen} onOpenChange={setSyncOpen} />

      {/* Pricing Rule Dialog */}
      <PricingRuleDialog open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  )
}
