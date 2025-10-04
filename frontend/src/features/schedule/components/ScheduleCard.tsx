import type { Schedule } from '../types/schedule'
import { EditableCell } from './EditableCell'
import { MemoCell } from './MemoCell'
import { DatePickerCell } from './DatePickerCell'
import { TimePickerCell } from './TimePickerCell'
import { TagSelectCell } from './TagSelectCell'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useTagOptions } from '../hooks/useTagOptions'
import { Calendar, Clock, MapPin, Phone, User, Camera, Image, DollarSign, UserCog } from 'lucide-react'

interface ScheduleCardProps {
  schedule: Schedule
  isSelected: boolean
  onToggleSelect: () => void
  onDeleteTag: (tagValue: string, field: 'brand' | 'album') => void
}

export function ScheduleCard({ schedule, isSelected, onToggleSelect, onDeleteTag }: ScheduleCardProps) {
  const updateSchedule = useUpdateSchedule()
  const { brandOptions, albumOptions } = useTagOptions()

  return (
    <div
      className={`
        rounded-lg border border-border bg-card p-4 shadow-sm
        transition-all hover:shadow-md w-full max-w-full overflow-hidden
        ${isSelected ? 'ring-2 ring-primary' : ''}
      `}
    >
      {/* Header with checkbox */}
      <div className="flex items-start justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 cursor-pointer"
        />
        <div className="flex-1 ml-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <DatePickerCell
              value={schedule.date}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  date: value
                })
              }}
            />
            <Clock className="h-4 w-4 ml-2" />
            <TimePickerCell
              value={schedule.time}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  time: value
                })
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <EditableCell
              value={schedule.location}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  location: value
                })
              }}
            />
          </div>
        </div>

        {/* Couple */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <EditableCell
              value={schedule.groom}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  groom: value
                })
              }}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <EditableCell
              value={schedule.contact}
              onSave={(value) => {
                const isEmail = value.includes('@')
                if (isEmail) {
                  updateSchedule.mutate({
                    id: schedule.id,
                    contact: value.trim()
                  })
                } else {
                  const numbers = value.replace(/\D/g, '')
                  let formatted = numbers
                  if (numbers.length === 11) {
                    formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
                  } else if (numbers.length === 10) {
                    formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
                  }
                  updateSchedule.mutate({
                    id: schedule.id,
                    contact: formatted
                  })
                }
              }}
              format={(val) => {
                const str = String(val)
                if (str.includes('@')) return str
                const numbers = str.replace(/\D/g, '')
                if (numbers.length === 11) {
                  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
                } else if (numbers.length === 10) {
                  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
                }
                return str
              }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-accent/50 rounded text-xs">
            <Camera className="h-3 w-3" />
            <TagSelectCell
              value={schedule.brand}
              options={brandOptions}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  brand: value
                })
              }}
              onDelete={(tag) => onDeleteTag(tag, 'brand')}
            />
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-accent/50 rounded text-xs">
            <Image className="h-3 w-3" />
            <TagSelectCell
              value={schedule.album}
              options={albumOptions}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  album: value
                })
              }}
              onDelete={(tag) => onDeleteTag(tag, 'album')}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Camera className="h-3 w-3" />
            <EditableCell
              value={schedule.photographer}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  photographer: value
                })
              }}
            />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">컷:</span>
            <EditableCell
              value={schedule.cuts}
              onSave={(value) => {
                const num = parseInt(value.replace(/\D/g, ''))
                if (!isNaN(num)) {
                  updateSchedule.mutate({
                    id: schedule.id,
                    cuts: num
                  })
                }
              }}
              validate={(value) => {
                const num = parseInt(value.replace(/\D/g, ''))
                return !isNaN(num) && num >= 0
              }}
              format={(val) => {
                const num = Number(val)
                return num > 0 ? num.toLocaleString() : ''
              }}
            />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <EditableCell
              value={schedule.price}
              onSave={(value) => {
                const num = parseInt(value.replace(/\D/g, ''))
                if (!isNaN(num)) {
                  updateSchedule.mutate({
                    id: schedule.id,
                    price: num
                  })
                }
              }}
              validate={(value) => {
                const num = parseInt(value.replace(/\D/g, ''))
                return !isNaN(num) && num >= 0
              }}
              format={(val) => {
                const num = Number(val)
                return num > 0 ? num.toLocaleString() : ''
              }}
            />
          </div>
        </div>

        {/* Manager */}
        {schedule.manager && (
          <div className="flex items-start gap-2">
            <UserCog className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <EditableCell
                value={schedule.manager}
                onSave={(value) => {
                  updateSchedule.mutate({
                    id: schedule.id,
                    manager: value
                  })
                }}
              />
            </div>
          </div>
        )}

        {/* Memo */}
        {schedule.memo && (
          <div className="pt-2 border-t border-border">
            <MemoCell
              value={schedule.memo}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  memo: value
                })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
