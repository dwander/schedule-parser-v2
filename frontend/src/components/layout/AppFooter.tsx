interface StatItem {
  label: string
  value: string | number
}

interface AppFooterProps {
  stats?: {
    scheduleCount?: number
    totalCuts?: number
    totalPrice?: number
  }
}

export function AppFooter({ stats }: AppFooterProps) {
  const items: StatItem[] = [
    { label: '스케줄', value: stats?.scheduleCount ?? 0 },
    { label: '촬영 컷수', value: stats?.totalCuts ?? 0 },
    { label: '촬영비', value: stats?.totalPrice ? `${stats.totalPrice.toLocaleString()}원` : '0원' },
  ]

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="flex h-12 items-center justify-around px-4 gap-2 sm:gap-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
            <span className="font-semibold text-foreground whitespace-nowrap">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Safe area for mobile bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </footer>
  )
}
