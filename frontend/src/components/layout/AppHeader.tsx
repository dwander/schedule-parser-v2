import { ListPlus, FolderSync } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'

interface AppHeaderProps {
  onAddClick?: () => void
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
}

export function AppHeader({ onAddClick, onFolderSyncClick, onBackupRestoreClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40">
      {/* Safe area for mobile status bar */}
      <div className="h-[env(safe-area-inset-top)]" />

      <div className="flex h-14 items-center justify-between px-[0.625rem]">
        {/* Left: User Menu */}
        <UserMenu
          onFolderSyncClick={onFolderSyncClick}
          onBackupRestoreClick={onBackupRestoreClick}
        />

        {/* Right: Buttons */}
        <div className="flex items-center gap-2">
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
