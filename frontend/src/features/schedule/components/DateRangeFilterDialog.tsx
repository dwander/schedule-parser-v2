import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
import { useState } from 'react'
import { addWeeks, addMonths, addYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangeFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateRange: { from: Date | null; to: Date | null }
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void
}

export function DateRangeFilterDialog({
  open,
  onOpenChange,
  dateRange,
  onDateRangeChange,
}: DateRangeFilterDialogProps) {
  const [tempFrom, setTempFrom] = useState<Date | undefined>(dateRange.from || undefined)
  const [tempTo, setTempTo] = useState<Date | undefined>(dateRange.to || undefined)
  const [relativeTime, setRelativeTime] = useState<'last' | 'this' | 'next'>('this')
  const [relativeUnit, setRelativeUnit] = useState<'week' | 'month' | 'year'>('week')

  const handleApply = () => {
    if (tempFrom && tempTo) {
      onDateRangeChange({ from: tempFrom, to: tempTo })
    }
    onOpenChange(false)
  }

  const handleQuickSelect = (type: 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'all') => {
    const now = new Date()
    let from: Date
    let to: Date

    switch (type) {
      case 'today':
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 0 })
        to = endOfWeek(now, { weekStartsOn: 0 })
        break
      case 'thisMonth':
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case 'thisYear':
        from = startOfYear(now)
        to = endOfYear(now)
        break
      case 'all':
        setTempFrom(undefined)
        setTempTo(undefined)
        onDateRangeChange({ from: null, to: null })
        onOpenChange(false)
        return
    }

    setTempFrom(from)
    setTempTo(to)
  }

  const handleRelativeSelect = () => {
    const now = new Date()
    let from: Date
    let to: Date

    if (relativeTime === 'last') {
      if (relativeUnit === 'week') {
        from = startOfWeek(addWeeks(now, -1), { weekStartsOn: 0 })
        to = endOfWeek(addWeeks(now, -1), { weekStartsOn: 0 })
      } else if (relativeUnit === 'month') {
        from = startOfMonth(addMonths(now, -1))
        to = endOfMonth(addMonths(now, -1))
      } else {
        from = startOfYear(addYears(now, -1))
        to = endOfYear(addYears(now, -1))
      }
    } else if (relativeTime === 'this') {
      if (relativeUnit === 'week') {
        from = startOfWeek(now, { weekStartsOn: 0 })
        to = endOfWeek(now, { weekStartsOn: 0 })
      } else if (relativeUnit === 'month') {
        from = startOfMonth(now)
        to = endOfMonth(now)
      } else {
        from = startOfYear(now)
        to = endOfYear(now)
      }
    } else {
      // next
      if (relativeUnit === 'week') {
        from = startOfWeek(addWeeks(now, 1), { weekStartsOn: 0 })
        to = endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 })
      } else if (relativeUnit === 'month') {
        from = startOfMonth(addMonths(now, 1))
        to = endOfMonth(addMonths(now, 1))
      } else {
        from = startOfYear(addYears(now, 1))
        to = endOfYear(addYears(now, 1))
      }
    }

    setTempFrom(from)
    setTempTo(to)
  }

  const handleReset = () => {
    setTempFrom(undefined)
    setTempTo(undefined)
    onDateRangeChange({ from: null, to: null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>날짜 범위 선택</DialogTitle>
          <DialogDescription>
            필터링할 날짜 범위를 설정하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 빠른 선택 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">빠른 선택</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('today')}>
                오늘
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisWeek')}>
                이번주
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisMonth')}>
                이번달
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisYear')}>
                올해
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('all')}>
                전체
              </Button>
            </div>
          </div>

          {/* 간편 선택 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">간편 선택</h4>
            <div className="flex gap-2 items-center">
              <Select value={relativeTime} onValueChange={(v) => setRelativeTime(v as any)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last">지난</SelectItem>
                  <SelectItem value="this">이번</SelectItem>
                  <SelectItem value="next">다음</SelectItem>
                </SelectContent>
              </Select>
              <Select value={relativeUnit} onValueChange={(v) => setRelativeUnit(v as any)}>
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
            <h4 className="text-sm font-medium">직접 선택</h4>
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleApply} disabled={!tempFrom || !tempTo}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
