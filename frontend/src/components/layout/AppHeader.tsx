import { Component1Icon, PlusIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  onMenuClick: () => void
  onAddClick?: () => void
}

export function AppHeader({ onMenuClick, onAddClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40">
      {/* Safe area for mobile status bar */}
      <div className="h-[env(safe-area-inset-top)]" />

      <div className="flex h-14 items-center justify-between px-[0.625rem]">
        {/* Left: Sidebar Panel Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onMenuClick}
          aria-label="사이드패널 열기"
          className="-ml-[0.9375rem] bg-background/50 backdrop-blur-sm"
        >
          <Component1Icon className="h-[1.25rem] w-[1.25rem]" />
        </Button>

        {/* Right: Add Schedule Button (Floating style) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddClick}
          aria-label="새 스케줄 추가"
          className="bg-background/50 backdrop-blur-sm"
        >
          <PlusIcon className="h-[1.25rem] w-[1.25rem]" />
          <span>새 스케줄</span>
        </Button>
      </div>
    </header>
  )
}
