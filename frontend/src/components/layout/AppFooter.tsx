import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/stores/useSettingsStore'

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
  const { priceMode, setPriceMode } = useSettingsStore()

  const totalPrice = stats?.totalPrice ?? 0
  const netPrice = Math.floor(totalPrice * 0.967)

  const items: StatItem[] = [
    { label: '스케줄', value: stats?.scheduleCount ?? 0 },
    { label: '촬영 컷수', value: (stats?.totalCuts ?? 0).toLocaleString() },
    {
      label: '촬영비',
      value: priceMode === 'total'
        ? `${totalPrice.toLocaleString()}원`
        : `${netPrice.toLocaleString()}원`
    },
  ]

  return (
    <footer className="w-full flex justify-center py-4 bg-background">
      <div className="max-w-[450px] w-full mx-4 border border-border/50 rounded-lg bg-background">
        <div className="flex h-12 items-center justify-around px-4 gap-2 sm:gap-4">
          {items.map((item, index) => {
            if (item.label === '촬영비') {
              return (
                <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
                  <Select value={priceMode} onValueChange={(value: 'total' | 'net') => setPriceMode(value)}>
                    <SelectTrigger className="h-7 w-auto border-none shadow-none px-1 hover:bg-accent focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      <SelectValue className="font-semibold text-foreground whitespace-nowrap">
                        {item.value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">총액: {totalPrice.toLocaleString()}원</SelectItem>
                      <SelectItem value="net">실수령: {netPrice.toLocaleString()}원</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            }
            return (
              <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
                <span className="font-semibold text-foreground whitespace-nowrap">{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Safe area for mobile bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)]" />
    </footer>
  )
}
