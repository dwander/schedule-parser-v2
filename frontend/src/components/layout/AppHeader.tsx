import { ListPlus, FolderSync, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'
import { useEffect, useState } from 'react'

interface AppHeaderProps {
  onAddClick?: () => void
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
  selectedCount?: number
  onDeleteClick?: () => void
}

export function AppHeader({ onAddClick, onFolderSyncClick, onBackupRestoreClick, selectedCount = 0, onDeleteClick }: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20
      setIsScrolled(prev => prev !== scrolled ? scrolled : prev)
    }

    // 초기 상태 확인
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="sticky top-0 z-40">
      {/* Safe area for mobile status bar */}
      <div className="h-[env(safe-area-inset-top)]" />

      <div
        className={`
          flex h-14 items-center justify-between px-[0.625rem]
          bg-background/60 backdrop-blur-sm
          transition-all duration-500 ease-in-out
          ${isScrolled ? 'border-b-2 border-border/20' : 'border-b-2 border-transparent'}
        `}
        style={{
          boxShadow: isScrolled
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.15)'
            : '0 0 0 0 rgba(0, 0, 0, 0)'
        }}
      >
        {/* Left: User Menu */}
        <UserMenu
          onFolderSyncClick={onFolderSyncClick}
          onBackupRestoreClick={onBackupRestoreClick}
        />

        {/* Right: Buttons */}
        <div className="flex items-center gap-2">
          {/* Delete Button (체크된 항목이 있을 때만 표시) */}
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteClick}
              aria-label="선택 항목 삭제"
              className="bg-background/50 backdrop-blur-sm"
            >
              <Trash2 className="h-[1.25rem] w-[1.25rem] text-destructive" />
            </Button>
          )}

          {/* Folder Sync Button (Desktop only) */}
          <Button
            variant="outline"
            size="icon"
            onClick={onFolderSyncClick}
            aria-label="폴더 동기화"
            className="hidden md:flex bg-background/50 backdrop-blur-sm"
          >
            <FolderSync className="h-[1.25rem] w-[1.25rem]" />
          </Button>

          {/* Add Schedule Button (Floating style) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddClick}
            aria-label="새 스케줄 추가"
            className="bg-background/50 backdrop-blur-sm"
          >
            <ListPlus className="h-[1.25rem] w-[1.25rem]" />
            <span className="hidden sm:inline">새 스케줄</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
