import type { Schedule } from '../types/schedule'
import { EditableCell } from './EditableCell'
import { MemoCell } from './MemoCell'
import { DatePickerCell } from './DatePickerCell'
import { TimePickerCell } from './TimePickerCell'
import { TagSelectCell } from './TagSelectCell'
import { PhotoNoteDialog } from './PhotoNoteDialog'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useTagOptions } from '../hooks/useTagOptions'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Phone, User, Camera, Image, DollarSign, UserCog, FileText } from 'lucide-react'
import { useState } from 'react'

interface ScheduleCardProps {
  schedule: Schedule
  isSelected: boolean
  isDuplicate?: boolean
  isConflict?: boolean
  onToggleSelect: () => void
  onDeleteTag: (tagValue: string, field: 'brand' | 'album') => void
}

export function ScheduleCard({ schedule, isSelected, isDuplicate = false, isConflict = false, onToggleSelect, onDeleteTag }: ScheduleCardProps) {
  const updateSchedule = useUpdateSchedule()
  const { brandOptions, albumOptions } = useTagOptions()
  const { columnVisibility } = useSettingsStore()
  const [photoNoteOpen, setPhotoNoteOpen] = useState(false)

  return (
    <div
      className={`
        rounded-lg border shadow-sm
        transition-all hover:shadow-md w-full max-w-full overflow-hidden
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${
          isDuplicate
            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500 border-l-4'
            : isConflict
            ? 'bg-red-50 dark:bg-red-950/20 border-red-500 border-l-4'
            : 'border-border bg-card'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Left: Checkbox */}
        {columnVisibility.select && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 cursor-pointer flex-shrink-0 w-4 h-4"
          />
        )}

        {/* Center: Location + Date/Time */}
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <EditableCell
              value={schedule.location}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  location: value
                })
              }}
              placeholder="장소"
              className="font-medium text-base"
            />
          </div>
          <div className="flex items-center text-xs text-muted-foreground -space-x-3">
            <DatePickerCell
              value={schedule.date}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  date: value
                })
              }}
            />
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

        {/* Right: Brand + Album */}
        <div className="flex-shrink-0 space-y-1 text-right">
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
            placeholder="브랜드"
          />
          <div className="text-xs text-muted-foreground">
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
              placeholder="앨범"
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Content */}
      <div className="p-4 pt-3 space-y-3">
        {/* Top: Fields with FAB Buttons */}
        <div className="flex gap-3">
          {/* Left: Fields */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Couple */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                  <EditableCell
                  value={schedule.couple}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      couple: value
                    })
                  }}
                  placeholder="신랑신부"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                placeholder="연락처"
              />
            </div>
          </div>

          {/* Photographer */}
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <EditableCell
                  value={schedule.photographer}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      photographer: value
                    })
                  }}
                  placeholder="작가"
                />
              </div>
            </div>

            {/* Cuts */}
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
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
                  placeholder="컷수"
                />
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
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
                  placeholder="촬영비"
                />
              </div>
            </div>

            {/* Manager */}
            {schedule.manager && (
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <EditableCell
                    value={schedule.manager}
                    onSave={(value) => {
                      updateSchedule.mutate({
                        id: schedule.id,
                        manager: value
                      })
                    }}
                    placeholder="계약자"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: FAB Buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-shadow"
              onClick={() => setPhotoNoteOpen(true)}
              title="촬영노트"
            >
              <FileText className="h-4 w-4" />
            </Button>
            {/* 추후 추가될 버튼들 */}
            {/* <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="구글 캘린더">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="폴더명 복사">
              <Folder className="h-4 w-4" />
            </Button> */}
          </div>
        </div>

        {/* Memo - Full width */}
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
              cardMode={true}
            />
          </div>
        )}
      </div>

      {/* PhotoNote Dialog */}
      <PhotoNoteDialog
        open={photoNoteOpen}
        onOpenChange={setPhotoNoteOpen}
        schedule={schedule}
      />
    </div>
  )
}
