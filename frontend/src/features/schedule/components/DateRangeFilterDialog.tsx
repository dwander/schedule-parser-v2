import { ContentModal } from '@/components/common/ContentModal'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore, type DateRangePreset } from '@/stores/useSettingsStore'
import { calculateDateRangeFromPreset } from '@/lib/utils/datePresets'

interface DateRangeFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateRange: { preset: DateRangePreset; from: Date | null; to: Date | null }
  onDateRangeChange: (range: { preset?: DateRangePreset; from: Date | null; to: Date | null }) => void
}

export function DateRangeFilterDialog({
  open,
  onOpenChange,
  dateRange,
  onDateRangeChange,
}: DateRangeFilterDialogProps) {
  const { weekStartsOn } = useSettingsStore()
  const [tempFrom, setTempFrom] = useState<Date | undefined>(dateRange.from || undefined)
  const [tempTo, setTempTo] = useState<Date | undefined>(dateRange.to || undefined)

  // 현재 선택된 프리셋으로부터 초기값 결정
  const getInitialRelativeValues = () => {
    const preset = dateRange.preset
    if (preset === 'lastWeek') return { time: 'last' as const, unit: 'week' as const }
    if (preset === 'lastMonth') return { time: 'last' as const, unit: 'month' as const }
    if (preset === 'lastYear') return { time: 'last' as const, unit: 'year' as const }
    if (preset === 'thisWeek') return { time: 'this' as const, unit: 'week' as const }
    if (preset === 'thisMonth') return { time: 'this' as const, unit: 'month' as const }
    if (preset === 'thisYear') return { time: 'this' as const, unit: 'year' as const }
    if (preset === 'nextWeek') return { time: 'next' as const, unit: 'week' as const }
    if (preset === 'nextMonth') return { time: 'next' as const, unit: 'month' as const }
    if (preset === 'nextYear') return { time: 'next' as const, unit: 'year' as const }
    return { time: 'this' as const, unit: 'week' as const }
  }

  const initialValues = getInitialRelativeValues()
  const [relativeTime, setRelativeTime] = useState<'last' | 'this' | 'next'>(initialValues.time)
  const [relativeUnit, setRelativeUnit] = useState<'week' | 'month' | 'year'>(initialValues.unit)

  // 모달이 열릴 때마다 현재 프리셋에 맞춰 상태 업데이트
  useEffect(() => {
    if (open) {
      const values = getInitialRelativeValues()
      setRelativeTime(values.time)
      setRelativeUnit(values.unit)
      setTempFrom(dateRange.from || undefined)
      setTempTo(dateRange.to || undefined)
    }
  }, [open, dateRange.preset])

  const handleApply = () => {
    if (tempFrom && tempTo) {
      // 직접 선택한 경우 preset을 'custom'으로 설정
      onDateRangeChange({ preset: 'custom', from: tempFrom, to: tempTo })
    }
    onOpenChange(false)
  }

  const handleQuickSelect = (preset: DateRangePreset) => {
    if (preset === 'all') {
      // 전체기간 선택 - preset만 저장하고 날짜는 null
      onDateRangeChange({ preset: 'all', from: null, to: null })
      onOpenChange(false)
      return
    }

    // 프리셋 기반으로 날짜 계산
    const range = calculateDateRangeFromPreset(preset, weekStartsOn)
    if (range) {
      // 프리셋과 계산된 날짜 모두 저장하고 바로 적용
      onDateRangeChange({ preset, from: range.from, to: range.to })
      onOpenChange(false)
    }
  }

  const handleRelativeSelect = () => {
    // 간편 선택으로 프리셋 생성 (예: 'lastWeek', 'thisMonth', 'nextYear')
    const presetMap: Record<string, DateRangePreset> = {
      'last-week': 'lastWeek',
      'last-month': 'lastMonth',
      'last-year': 'lastYear',
      'this-week': 'thisWeek',
      'this-month': 'thisMonth',
      'this-year': 'thisYear',
      'next-week': 'nextWeek',
      'next-month': 'nextMonth',
      'next-year': 'nextYear',
    }

    const presetKey = `${relativeTime}-${relativeUnit}`
    const preset = presetMap[presetKey]

    if (preset) {
      // 프리셋 기반으로 날짜 계산
      const range = calculateDateRangeFromPreset(preset, weekStartsOn)
      if (range) {
        // 프리셋과 계산된 날짜 모두 저장하고 바로 적용
        onDateRangeChange({ preset, from: range.from, to: range.to })
        onOpenChange(false)
      }
    }
  }

  const handleReset = () => {
    setTempFrom(undefined)
    setTempTo(undefined)
    // 초기화 시 preset을 null로 설정 (전체기간)
    onDateRangeChange({ preset: null, from: null, to: null })
  }

  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      title="날짜 범위 선택"
      subtitle="필터링할 날짜 범위를 설정하세요"
      showFooter={true}
      footerContent={
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
          <div className="flex-1"></div>
          <Button
            onClick={handleApply}
            disabled={!tempFrom || !tempTo}
            className={cn(
              tempFrom && tempTo && dateRange.preset === 'custom' && 'border-2 border-primary'
            )}
          >
            적용
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 빠른 선택 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">빠른 선택</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('today')}
              className={cn(
                dateRange.preset === 'today' && 'border-2 border-primary'
              )}
            >
              오늘
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('thisWeek')}
              className={cn(
                dateRange.preset === 'thisWeek' && 'border-2 border-primary'
              )}
            >
              이번주
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('thisMonth')}
              className={cn(
                dateRange.preset === 'thisMonth' && 'border-2 border-primary'
              )}
            >
              이번달
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('thisYear')}
              className={cn(
                dateRange.preset === 'thisYear' && 'border-2 border-primary'
              )}
            >
              올해
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('all')}
              className={cn(
                dateRange.preset === 'all' && 'border-2 border-primary'
              )}
            >
              전체
            </Button>
          </div>
        </div>

        {/* 간편 선택 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">간편 선택</h4>
          <div className="flex gap-2 items-center">
            <Select value={relativeTime} onValueChange={(v) => setRelativeTime(v as 'last' | 'this' | 'next')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last">지난</SelectItem>
                <SelectItem value="this">이번</SelectItem>
                <SelectItem value="next">다음</SelectItem>
              </SelectContent>
            </Select>
            <Select value={relativeUnit} onValueChange={(v) => setRelativeUnit(v as 'week' | 'month' | 'year')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">주</SelectItem>
                <SelectItem value="month">월</SelectItem>
                <SelectItem value="year">년</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={handleRelativeSelect}>
              적용
            </Button>
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            직접 선택
            {dateRange.preset === 'custom' && (
              <span className="ml-2 text-xs text-primary">(현재 선택됨)</span>
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 시작일 */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">시작일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tempFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempFrom ? (
                      tempFrom.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/\. /g, '.').replace(/\.$/, '')
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempFrom}
                    onSelect={setTempFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 종료일 */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">종료일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tempTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempTo ? (
                      tempTo.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/\. /g, '.').replace(/\.$/, '')
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempTo}
                    onSelect={setTempTo}
                    disabled={(date) => tempFrom ? date < tempFrom : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </ContentModal>
  )
}
