import { CalendarPlus, FolderSync, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'
import { useEffect, useState } from 'react'
import { DEBOUNCE } from '@/lib/constants/timing'

interface AppHeaderProps {
  onAddClick?: () => void
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
  selectedCount?: number
  onDeleteClick?: () => void
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
}

export function AppHeader({ onAddClick, onFolderSyncClick, onBackupRestoreClick, selectedCount = 0, onDeleteClick, globalFilter = '', onGlobalFilterChange }: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [localFilter, setLocalFilter] = useState(globalFilter)

  // 스크롤 감지
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

  // 디바운싱된 검색
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localFilter !== globalFilter) {
        onGlobalFilterChange?.(localFilter)
      }
    }, DEBOUNCE.SEARCH)

    return () => clearTimeout(timeoutId)
  }, [localFilter, globalFilter, onGlobalFilterChange])

  // 외부 globalFilter 변경 시 동기화
  useEffect(() => {
    if (globalFilter !== localFilter) {
      setLocalFilter(globalFilter)
    }
  }, [globalFilter])

  return (
    <header className="sticky top-0 z-40">
      {/* Safe area for mobile status bar */}
      <div className="h-[env(safe-area-inset-top)]" />

      <div
        className={`
          flex h-14 items-center justify-between px-[0.625rem] gap-3
          bg-background/20 backdrop-blur-lg
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

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              placeholder="스케줄 검색..."
              className="w-full h-9 pl-9 pr-4 rounded-full border border-input bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2">
          {/* Delete Button (체크된 항목이 있을 때만 표시) */}
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteClick}
              aria-label="선택 항목 삭제"
              className="bg-background/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all rounded-lg"
            >
              <Trash2 className="h-[1.25rem] w-[1.25rem] text-destructive" />
            </Button>
          )}

          {/* Folder Sync Button (Desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onFolderSyncClick}
            aria-label="폴더 동기화"
            className="hidden md:flex bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all rounded-lg"
          >
            <FolderSync className="h-[1.25rem] w-[1.25rem]" />
          </Button>

          {/* Add Schedule Button (Floating style) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddClick}
            aria-label="새 스케줄 추가"
            className="bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all rounded-lg"
          >
            <CalendarPlus className="h-[1.25rem] w-[1.25rem]" />
            <span className="font-semibold">새 스케줄</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
