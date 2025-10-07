import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface TimePickerCellProps {
  value: string // HH:mm 형식
  onSave: (value: string) => void
}

export function TimePickerCell({ value, onSave }: TimePickerCellProps) {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('12')
  const [minutes, setMinutes] = useState('00')
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM')
  const hoursRef = useRef<HTMLInputElement>(null)

  // value를 AM/PM 형식으로 파싱
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      const hour = parseInt(h)
      if (hour === 0) {
        setHours('12')
        setPeriod('AM')
      } else if (hour < 12) {
        setHours(hour.toString())
        setPeriod('AM')
      } else if (hour === 12) {
        setHours('12')
        setPeriod('PM')
      } else {
        setHours((hour - 12).toString())
        setPeriod('PM')
      }
      setMinutes(m)
    }
  }, [value])

  // Popover 열릴 때 시간 입력 필드에 포커스
  useEffect(() => {
    if (open && hoursRef.current) {
      setTimeout(() => hoursRef.current?.select(), 50)
    }
  }, [open])

  const handleSave = () => {
    let h = parseInt(hours)
    if (isNaN(h) || h < 1 || h > 12) h = 12

    let m = parseInt(minutes)
    if (isNaN(m) || m < 0 || m > 59) m = 0

    // 24시간 형식으로 변환
    let hour24 = h
    if (period === 'AM') {
      if (h === 12) hour24 = 0
    } else {
      if (h !== 12) hour24 = h + 12
    }

    const formatted = `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    onSave(formatted)
    setOpen(false)
  }

  const displayValue = value || '--:--'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-left font-normal px-2 py-1 h-auto hover:bg-accent/50 border border-input',
            !value && 'text-muted-foreground'
          )}
        >
          {value ? displayValue : '시간 선택'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              ref={hoursRef}
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setOpen(false)
              }}
              className="w-12 px-2 py-1.5 text-center border border-input rounded bg-background focus:ring-1 focus:ring-ring/30 focus:outline-none"
              placeholder="12"
            />
            <span className="text-lg">:</span>
            <input
              type="text"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setOpen(false)
              }}
              className="w-12 px-2 py-1.5 text-center border border-input rounded bg-background focus:ring-1 focus:ring-ring/30 focus:outline-none"
              placeholder="00"
            />
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant={period === 'AM' ? 'default' : 'outline'}
                onClick={() => setPeriod('AM')}
                className="w-12"
              >
                AM
              </Button>
              <Button
                size="sm"
                variant={period === 'PM' ? 'default' : 'outline'}
                onClick={() => setPeriod('PM')}
                className="w-12"
              >
                PM
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={handleSave}>
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
