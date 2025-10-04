import { ReactNode, useState } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppFooter } from './AppFooter'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'

interface AppLayoutProps {
  children: ReactNode
  stats?: {
    scheduleCount?: number
    totalCuts?: number
    totalPrice?: number
  }
  onAddClick?: () => void
}

export function AppLayout({ children, stats, onAddClick }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-background">
      {/* Floating Header */}
      <AppHeader onMenuClick={() => setSidebarOpen(true)} onAddClick={onAddClick} />

      {/* Sidebar */}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSettingsClick={() => {
          setSettingsOpen(true)
          setSidebarOpen(false)
        }}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Main Content */}
      <main>
        {children}

        {/* Footer as part of content */}
        <AppFooter stats={stats} />
      </main>
    </div>
  )
}
