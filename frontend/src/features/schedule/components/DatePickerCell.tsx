import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { parseScheduleDateString, formatToScheduleDate } from '@/lib/utils/dateParser'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerCellProps {
  value: string // YYYY.MM.DD 형식
  onSave: (value: string) => void
}

export function DatePickerCell({ value, onSave }: DatePickerCellProps) {
  const [open, setOpen] = useState(false)
  const date = value ? parseScheduleDateString(value) : undefined

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formatted = formatToScheduleDate(selectedDate)
      onSave(formatted)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-left font-normal px-2 py-1 h-auto hover:bg-accent/50 border border-input',
            !date && 'text-muted-foreground'
          )}
        >
          {date ? format(date, 'yyyy/MM/dd', { locale: ko }) : '날짜 선택'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={ko}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
