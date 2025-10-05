import { PanelLeftClose, FolderSync, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { LoginDialog } from '@/features/auth/components/LoginDialog'
import { useEffect, useState } from 'react'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
  onSettingsClick?: () => void
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
}

export function AppSidebar({ open, onClose, onSettingsClick, onFolderSyncClick, onBackupRestoreClick }: AppSidebarProps) {
  const { testPanelVisible, setTestPanelVisible } = useSettingsStore()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

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
            className="-ml-[0.625rem]"
          >
            <PanelLeftClose className="h-[1.25rem] w-[1.25rem]" />
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 설정 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">설정</h3>
            <div className="space-y-2">
              <button
                onClick={onSettingsClick}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                앱 설정
              </button>
            </div>
          </div>

          {/* 데이터 관리 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">데이터 관리</h3>
            <div className="space-y-2">
              <button
                onClick={onFolderSyncClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <FolderSync className="h-4 w-4" />
                폴더 동기화
              </button>
              <button
                onClick={onBackupRestoreClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <Database className="h-4 w-4" />
                데이터 백업 및 복원
              </button>
            </div>
          </div>

          {/* 섹션 3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">섹션 3</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                메뉴 3-1
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                메뉴 3-2
              </button>
            </div>
          </div>

          {/* 개발자 도구 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">개발자 도구</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors">
                <span className="text-sm text-muted-foreground">UI 테스트 패널</span>
                <Switch
                  checked={testPanelVisible}
                  onCheckedChange={setTestPanelVisible}
                />
              </div>
            </div>
          </div>
        </nav>

        {/* Login/Logout Button */}
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={() => setLoginDialogOpen(true)}
          >
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

      {/* Login Dialog */}
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  )
}
