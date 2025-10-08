import { ReactNode, useEffect } from 'react'
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
}

const sizeClasses: Record<ContentModalSize, string> = {
  'sm': 'sm:max-w-sm',
  'md': 'sm:max-w-md',
  'lg': 'sm:max-w-lg',
  'xl': 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  'full': 'sm:max-w-[90vw] sm:h-[90vh]',
  'fullscreen-mobile': 'w-full h-full max-w-full sm:max-w-2xl sm:h-auto sm:max-h-[85vh] p-0 sm:p-6',
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
  hideClose = false,
}: ContentModalProps) {
  const isFullscreenMobile = size === 'fullscreen-mobile'

  // 브라우저 히스토리 관리
  useEffect(() => {
    if (!open) return

    // 모달이 열릴 때 히스토리 추가
    const modalState = { modal: true, timestamp: Date.now() }
    window.history.pushState(modalState, '')

    // 뒤로가기 이벤트 리스너
    const handlePopState = () => {
      // 뒤로가기로 모달을 닫을 때만 처리
      if (open) {
        onOpenChange(false)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      // 클린업 시 모달이 여전히 열려있다면 히스토리 정리
      if (open && window.history.state?.modal) {
        window.history.back()
      }
    }
  }, [open, onOpenChange])

  const handleClose = () => {
    onOpenChange(false)
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
          isFullscreenMobile && 'w-full h-full max-h-full rounded-none sm:w-[calc(100%-2rem)] sm:rounded-lg sm:max-h-[85vh] p-0 sm:p-4',
          className
        )}
        hideClose={true}
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
              <div className="flex items-center gap-3">
                {/* 뒤로가기 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={handleClose}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* 타이틀 & 서브타이틀 */}
                <div className="flex-1 min-w-0">
                  {title && <DialogTitle className="text-left">{title}</DialogTitle>}
                  {subtitle && (
                    typeof subtitle === 'string' ? (
                      <p className="text-sm text-muted-foreground text-left mt-1">{subtitle}</p>
                    ) : (
                      <div className="text-left mt-1">{subtitle}</div>
                    )
                  )}
                </div>

                {/* 오른쪽 액션 (토글 버튼 등) */}
                {headerAction && (
                  <div className="flex-shrink-0">
                    {headerAction}
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
