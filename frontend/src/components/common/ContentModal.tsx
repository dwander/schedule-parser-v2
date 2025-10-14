import { ReactNode, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ContentModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'fullscreen-mobile'

interface ContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  size?: ContentModalSize

  // Header options
  title?: string
  subtitle?: string | ReactNode
  headerContent?: ReactNode
  headerAction?: ReactNode
  showHeader?: boolean

  // Footer options
  footerContent?: ReactNode
  showFooter?: boolean

  // Content
  children: ReactNode

  // Style options
  className?: string
  contentClassName?: string
  hideClose?: boolean

  // History management
  useHistory?: boolean // 브라우저 히스토리 관리 활성화 여부 (기본값: true)
}

const sizeClasses: Record<ContentModalSize, string> = {
  'sm': 'sm:max-w-sm',
  'md': 'sm:max-w-md',
  'lg': 'sm:max-w-lg',
  'xl': 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  'full': 'sm:max-w-[90vw] sm:h-[90vh]',
  'fullscreen-mobile': 'w-full h-full max-w-full sm:max-w-[900px] sm:h-auto sm:max-h-[85vh] p-0 sm:p-6',
}

export function ContentModal({
  open,
  onOpenChange,
  size = 'lg',
  title,
  subtitle,
  headerContent,
  headerAction,
  showHeader = true,
  footerContent,
  showFooter = false,
  children,
  className,
  contentClassName,
  hideClose = true,
  useHistory = true,
}: ContentModalProps) {
  const isFullscreenMobile = size === 'fullscreen-mobile'
  const onOpenChangeRef = useRef(onOpenChange)
  const myStateRef = useRef<{ modal: boolean; modalId: string } | null>(null)
  const closedByPopStateRef = useRef(false)

  // onOpenChange ref 업데이트
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  // 브라우저 히스토리 관리
  useEffect(() => {
    if (!open || !useHistory) return

    closedByPopStateRef.current = false

    // 고유한 모달 ID 생성
    const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const modalState = { modal: true, modalId }
    myStateRef.current = modalState

    // 모달이 열릴 때 히스토리 추가
    window.history.pushState(modalState, '')

    // 뒤로가기 이벤트 리스너
    const handlePopState = () => {
      // 현재 history.state의 modalId가 내 modalId와 다르면 → 내가 pop된 것
      if (window.history.state?.modalId !== myStateRef.current?.modalId) {
        closedByPopStateRef.current = true
        onOpenChangeRef.current(false)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      // popstate로 닫힌 경우가 아니고, 내가 아직 스택에 있으면 제거
      if (!closedByPopStateRef.current &&
          window.history.state?.modalId === myStateRef.current?.modalId) {
        window.history.back()
      }

      myStateRef.current = null
    }
  }, [open, useHistory])

  const handleClose = () => {
    // 히스토리를 사용하는 모달이면 history.back()으로 닫기
    // (popstate 이벤트가 자동으로 모달을 닫음)
    if (useHistory && myStateRef.current) {
      window.history.back()
    } else {
      // 히스토리를 사용하지 않으면 직접 닫기
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // 기본 크기: 모바일에서 마진과 라운딩 적용
          'w-[calc(100%-2rem)] rounded-lg',
          // Flex 레이아웃과 최대 높이 설정 (grid 오버라이드)
          '!flex flex-col gap-0 max-h-[85vh]',
          // 패딩 조정
          'p-4',
          sizeClasses[size],
          isFullscreenMobile && 'w-full h-full max-h-full rounded-none border-0 sm:w-[calc(100%-2rem)] sm:rounded-lg sm:border sm:max-h-[85vh] p-0 sm:p-4',
          className
        )}
        hideClose={hideClose}
      >
        {/* Header */}
        {showHeader && (title || subtitle || headerContent) && (
          <DialogHeader className={cn(
            'text-left space-y-0',
            isFullscreenMobile && 'pb-4 border-b px-4 pt-4 sm:px-0 sm:pt-0'
          )}>
            {headerContent ? (
              headerContent
            ) : (
              <div className="space-y-2">
                {/* 첫 번째 줄: 뒤로가기 + 타이틀 */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -ml-2"
                    onClick={handleClose}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {title && (
                    <DialogTitle className="text-left flex-1 min-w-0">{title}</DialogTitle>
                  )}
                </div>

                {/* 두 번째 줄: 서브타이틀 + 액션버튼 */}
                {(subtitle || headerAction) && (
                  <div className="flex items-center gap-3 pl-11">
                    {/* 서브타이틀 */}
                    {subtitle && (
                      <div className="flex-1 min-w-0">
                        {typeof subtitle === 'string' ? (
                          <p className="text-sm text-muted-foreground text-left">{subtitle}</p>
                        ) : (
                          <div className="text-left">{subtitle}</div>
                        )}
                      </div>
                    )}

                    {/* 오른쪽 액션 (토글 버튼 등) */}
                    {headerAction && (
                      <div className="flex-shrink-0">
                        {headerAction}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
        )}

        {/* Content */}
        <div className={cn(
          'flex-1 overflow-y-auto min-h-0 py-4 px-2',
          isFullscreenMobile && 'px-4 sm:px-2',
          contentClassName
        )}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && footerContent && (
          <DialogFooter className={cn(
            isFullscreenMobile && 'pt-4 border-t px-4 pb-4 sm:px-0 sm:pb-0'
          )}>
            {footerContent}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
