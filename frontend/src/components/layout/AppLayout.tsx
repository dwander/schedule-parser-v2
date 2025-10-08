import { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
// import { AppSidebar } from './AppSidebar' // 사이드바 컴포넌트는 나중을 위해 유지
import { AppFooter } from './AppFooter'

interface AppLayoutProps {
  children: ReactNode
  stats?: {
    scheduleCount?: number
    totalCuts?: number
    totalPrice?: number
  }
  onAddClick?: () => void
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
  selectedCount?: number
  onDeleteClick?: () => void
}

export function AppLayout({ children, stats, onAddClick, onFolderSyncClick, onBackupRestoreClick, selectedCount, onDeleteClick }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Floating Header */}
      <AppHeader
        onAddClick={onAddClick}
        onFolderSyncClick={onFolderSyncClick}
        onBackupRestoreClick={onBackupRestoreClick}
        selectedCount={selectedCount}
        onDeleteClick={onDeleteClick}
      />

      {/* Main Content */}
      <main>
        {children}

        {/* Footer as part of content */}
        <AppFooter stats={stats} />
      </main>
    </div>
  )
}
