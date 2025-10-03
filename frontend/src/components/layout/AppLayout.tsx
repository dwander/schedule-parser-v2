import { ReactNode, useState } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppFooter } from './AppFooter'

interface AppLayoutProps {
  children: ReactNode
  stats?: {
    scheduleCount?: number
    totalCuts?: number
    totalPrice?: number
  }
}

export function AppLayout({ children, stats }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-background">
      {/* Floating Header */}
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main>
        {children}

        {/* Footer as part of content */}
        <AppFooter stats={stats} />
      </main>
    </div>
  )
}
