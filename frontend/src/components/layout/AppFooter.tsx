import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from '@/components/ui/button'

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
  const { priceMode, priceExpanded, setPriceExpanded } = useSettingsStore()

  const totalPrice = stats?.totalPrice ?? 0
  const netPrice = Math.floor(totalPrice * 0.967)

  const items: StatItem[] = [
    { label: '스케줄', value: stats?.scheduleCount ?? 0 },
    { label: '촬영 컷수', value: (stats?.totalCuts ?? 0).toLocaleString() },
    // 펼쳐진 경우: 총액과 실수령 모두 표시
    ...(priceExpanded ? [
      { label: '총액', value: `₩${totalPrice.toLocaleString()}` },
      { label: '실수령', value: `₩${netPrice.toLocaleString()}` },
    ] : [
      // 접힌 경우: priceMode에 따라 하나만 표시
      {
        label: '촬영비',
        value: priceMode === 'total'
          ? `₩${totalPrice.toLocaleString()}`
          : `₩${netPrice.toLocaleString()}`
      }
    ])
  ]

  return (
    <footer className="w-full flex flex-col items-center py-4 bg-background mb-4">
      <div className={`mx-[26px] border border-border/50 rounded-lg bg-background transition-all ${priceExpanded ? 'max-w-[600px]' : 'max-w-[450px]'}`}>
        <div className="flex h-12 items-center justify-around pl-6 pr-4 gap-4 sm:gap-8">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
              <span className="font-semibold text-foreground whitespace-nowrap">{item.value}</span>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-4"
            onClick={() => setPriceExpanded(!priceExpanded)}
            title={priceExpanded ? '접기' : '펼치기'}
          >
            {priceExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </footer>
  )
}
