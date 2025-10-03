import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // 오버레이 클릭으로 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      {/* Overlay (모바일에서만 보임) */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={handleOverlayClick}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-border bg-background transition-transform md:w-80',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Safe area for mobile status bar */}
        <div className="h-[env(safe-area-inset-top)]" />

        {/* Header with Back Button */}
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon className="h-[1.25rem] w-[1.25rem]" />
          </Button>
        </div>

        {/* Menu Items (나중에 추가) */}
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">메뉴 항목 (나중에 추가)</p>
        </nav>

        {/* Login/Logout Button */}
        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full" size="sm">
            로그인
          </Button>
        </div>

        {/* Footer - Legal & Version */}
        <div className="border-t border-border p-4">
          <div className="space-y-1 text-center">
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              법적 책임
            </a>
            <p className="text-xs text-muted-foreground">
              버전 v2.0.0
            </p>
          </div>
        </div>

        {/* Safe area for mobile bottom */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </aside>
    </>
  )
}
