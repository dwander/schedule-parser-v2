import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const { priceMode, priceExpanded, setPriceMode, setPriceExpanded } = useSettingsStore()

  const totalPrice = stats?.totalPrice ?? 0
  const netPrice = Math.floor(totalPrice * 0.967)

  // 모바일용 아이템 목록 (드롭다운 사용)
  const mobileItems: StatItem[] = [
    { label: '스케줄', value: stats?.scheduleCount ?? 0 },
    { label: '촬영 컷수', value: (stats?.totalCuts ?? 0).toLocaleString() },
    {
      label: '촬영비',
      value: priceMode === 'total'
        ? `₩${totalPrice.toLocaleString()}`
        : `₩${netPrice.toLocaleString()}`
    },
  ]

  // 데스크탑용 아이템 목록 (펼침 기능 사용)
  const desktopItems: StatItem[] = [
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
      {/* 모바일 버전 (드롭다운) */}
      <div className="sm:hidden max-w-[380px] mx-[26px] border border-border/50 rounded-lg bg-background">
        <div className="flex h-12 items-center justify-around pl-6 pr-4 gap-4">
          {mobileItems.map((item, index) => {
            if (item.label === '촬영비') {
              return (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
                  <Select value={priceMode} onValueChange={(value: 'total' | 'net') => setPriceMode(value)}>
                    <SelectTrigger className="h-7 w-auto border-none shadow-none px-1 hover:bg-accent focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      <SelectValue className="font-semibold text-foreground whitespace-nowrap">
                        <span className="text-muted-foreground">₩</span>{(item.value as string).slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">총액: ₩{totalPrice.toLocaleString()}</SelectItem>
                      <SelectItem value="net">실수령: ₩{netPrice.toLocaleString()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            }
            return (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground whitespace-nowrap">{item.label}</span>
                <span className="font-semibold text-foreground whitespace-nowrap">{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 데스크탑 버전 (펼침 버튼) */}
      <div className={`hidden sm:block mx-[26px] border border-border/50 rounded-lg bg-background transition-all ${priceExpanded ? 'max-w-[600px]' : 'max-w-[450px]'}`}>
        <div className="flex h-12 items-center justify-around pl-6 pr-4 gap-8">
          {desktopItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
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
