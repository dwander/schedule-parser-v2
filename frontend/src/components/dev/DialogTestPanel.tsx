import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { FormDialog } from '@/components/common/FormDialog'
import { ContentModal } from '@/components/common/ContentModal'
import { LoadingOverlay } from '@/components/common/LoadingOverlay'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { EmptyState } from '@/components/common/EmptyState'
import { FolderSyncModal } from '@/features/sync/components/FolderSyncModal'
import { PricingRuleDialog } from '@/features/pricing/components/PricingRuleDialog'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Moon, Sun, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { UI_TIMERS } from '@/lib/constants/timing'

export function DialogTestPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [loadingOpen, setLoadingOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [emptyOpen, setEmptyOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [contentModalSize, setContentModalSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen-mobile'>('lg')
  const [contentModalToggle, setContentModalToggle] = useState(false)
  const [name, setName] = useState('')
  const [swEnabled, setSwEnabled] = useState(false)
  const { theme, setTheme } = useSettingsStore()

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    toast.success(`${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환`)
  }

  // 서비스워커 상태 확인 함수
  const checkSwStatus = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      setSwEnabled(!!registration)
      return !!registration
    }
    return false
  }

  // 서비스워커 상태 확인
  useEffect(() => {
    checkSwStatus()
  }, [])

  const toggleServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('이 브라우저는 Service Worker를 지원하지 않습니다')
      return
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration) {
        // 서비스워커 해제
        await registration.unregister()

        // 캐시 삭제
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        }

        // 상태 업데이트
        setSwEnabled(false)
        toast.success('Service Worker가 해제되었습니다')
        toast.info('캐시가 모두 삭제되었습니다')
      } else {
        // 서비스워커 등록 - 페이지 새로고침 필요
        toast.info('Service Worker 등록을 위해 페이지를 새로고침합니다')
        setTimeout(() => window.location.reload(), UI_TIMERS.RELOAD_DELAY)
      }
    } catch (error) {
      console.error('Service Worker toggle error:', error)
      toast.error('Service Worker 전환 중 오류가 발생했습니다')
    }
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
        className="w-full mb-2"
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

      {/* 서비스워커 토글 (전체 너비) */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mb-3"
        onClick={toggleServiceWorker}
      >
        {swEnabled ? (
          <>
            <PowerOff className="h-4 w-4 mr-2" />
            SW 비활성화
          </>
        ) : (
          <>
            <Power className="h-4 w-4 mr-2" />
            SW 활성화
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
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setContentModalSize('lg')
              setContentModalOpen(true)
            }}
          >
            Content (lg)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setContentModalSize('fullscreen-mobile')
              setContentModalOpen(true)
            }}
          >
            Content (full)
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

      {/* Content Modal Test */}
      <ContentModal
        open={contentModalOpen}
        onOpenChange={setContentModalOpen}
        size={contentModalSize}
        title="ContentModal 테스트"
        subtitle="새로운 통합 모달 컴포넌트"
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {contentModalToggle ? '켜짐' : '꺼짐'}
            </span>
            <Switch
              checked={contentModalToggle}
              onCheckedChange={setContentModalToggle}
            />
          </div>
        }
        showFooter={true}
        footerContent={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setContentModalOpen(false)}>
              취소
            </Button>
            <Button onClick={() => {
              toast.success('저장 완료!')
              setContentModalOpen(false)
            }}>
              저장
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            현재 크기: <strong>{contentModalSize}</strong>
          </p>
          <p className="text-sm">
            이것은 새로운 ContentModal 컴포넌트입니다. 모바일에서도 마진과 라운딩이 적용되어 현대적인 느낌을 줍니다.
          </p>
          <p className="text-sm">
            오른쪽 상단의 토글: <strong>{contentModalToggle ? '활성화' : '비활성화'}</strong>
          </p>
          <div className="space-y-2">
            <Label>이름</Label>
            <Input placeholder="테스트 입력" />
          </div>
          <div className="space-y-2">
            <Label>설명</Label>
            <Input placeholder="설명을 입력하세요" />
          </div>

          {/* 스크롤 테스트용 긴 콘텐츠 */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">스크롤 테스트 콘텐츠</h3>
            {[...Array(20)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">섹션 {i + 1}</h4>
                <p className="text-sm text-muted-foreground">
                  이것은 스크롤 테스트를 위한 긴 콘텐츠입니다.
                  모달의 높이가 제한되고 컨텐츠 영역에 세로 스크롤바가
                  올바르게 나타나는지 확인하기 위한 더미 텍스트입니다.
                </p>
              </div>
            ))}
          </div>
        </div>
      </ContentModal>
    </div>
  )
}
