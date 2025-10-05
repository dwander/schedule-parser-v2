import type { Schedule } from '../types/schedule'
import { EditableCell } from './EditableCell'
import { MemoCell } from './MemoCell'
import { DatePickerCell } from './DatePickerCell'
import { TimePickerCell } from './TimePickerCell'
import { TagSelectCell } from './TagSelectCell'
import { PhotoNoteDialog } from './PhotoNoteDialog'
import { PhotoSequenceDialog } from './PhotoSequenceDialog'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useTagOptions } from '../hooks/useTagOptions'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarPlus, Clock, MapPin, Phone, User, Camera, Image, DollarSign, UserCog, FileText, ListTodo } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import axios from 'axios'

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
  const { user } = useAuthStore()
  const [photoNoteOpen, setPhotoNoteOpen] = useState(false)
  const [photoSequenceOpen, setPhotoSequenceOpen] = useState(false)
  const [naverCalendarConfirmOpen, setNaverCalendarConfirmOpen] = useState(false)

  // 구글 캘린더 URL 생성 함수
  const generateGoogleCalendarUrl = () => {
    // 날짜: "2025.04.05" → "20250405"
    const dateStr = schedule.date.replace(/\./g, '')

    // 시간: "14:00" → 시작: 13:00, 종료: 15:00
    const [hours, minutes] = schedule.time.split(':').map(Number)
    const startHour = String(hours - 1).padStart(2, '0')
    const endHour = String(hours + 1).padStart(2, '0')
    const minuteStr = String(minutes).padStart(2, '0')

    // ISO 8601 형식: 20250405T130000/20250405T150000
    const startDateTime = `${dateStr}T${startHour}${minuteStr}00`
    const endDateTime = `${dateStr}T${endHour}${minuteStr}00`

    // URL 파라미터 생성
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${schedule.location} - ${schedule.couple}`,
      dates: `${startDateTime}/${endDateTime}`,
      location: schedule.location,
    })

    if (schedule.memo) {
      params.append('details', schedule.memo)
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl()
    window.open(url, '_blank')
  }

  const handleNaverCalendarClick = () => {
    // 네이버 토큰 확인
    if (!user?.naverAccessToken) {
      toast.error('네이버 로그인이 필요합니다')
      return
    }

    // 확인 다이얼로그 열기
    setNaverCalendarConfirmOpen(true)
  }

  const handleNaverCalendarConfirm = async () => {
    try {
      // 날짜/시간 파싱
      const [year, month, day] = schedule.date.split('.').map(Number)
      const [hours, minutes] = schedule.time.split(':').map(Number)

      // 시작 시간 (예식 1시간 전)
      const startDate = new Date(year, month - 1, day, hours - 1, minutes)
      // 종료 시간 (예식 1시간 후)
      const endDate = new Date(year, month - 1, day, hours + 1, minutes)

      // 로컬 시간을 ISO 형식으로 변환 (UTC 변환 없이)
      const formatLocalISO = (date: Date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        const h = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${y}-${m}-${d}T${h}:${min}:00`
      }

      // 백엔드를 통해 네이버 캘린더 API 호출
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.post(
        `${apiUrl}/api/calendar/naver`,
        {
          access_token: user.naverAccessToken,
          subject: `${schedule.location} - ${schedule.couple}`,
          location: schedule.location,
          start_datetime: formatLocalISO(startDate),
          end_datetime: formatLocalISO(endDate),
          description: schedule.memo || ''
        }
      )

      if (response.data.result === 'success') {
        toast.success('네이버 캘린더에 일정이 추가되었습니다')
      } else {
        toast.error('일정 추가에 실패했습니다')
      }
    } catch (error: any) {
      console.error('네이버 캘린더 추가 실패:', error)
      if (error.response?.status === 401) {
        toast.error('네이버 로그인이 만료되었습니다. 다시 로그인해주세요.')
      } else {
        toast.error('네이버 캘린더 추가 중 오류가 발생했습니다')
      }
    }
  }

  // 촬영노트 데이터 존재 여부 확인
  const hasPhotoNoteData = useMemo(() => {
    const note = schedule.photoNote
    if (!note) return false

    return !!(
      note.importantMemo ||
      note.makeupShop?.name ||
      note.makeupShop?.departureTime ||
      note.makeupShop?.arrivalTime ||
      note.dress?.type ||
      note.dress?.material ||
      note.dress?.company ||
      note.familyRelations?.groomFamily ||
      note.familyRelations?.brideFamily ||
      note.ceremony?.host?.memo ||
      note.ceremony?.host?.type ||
      note.ceremony?.events?.memo ||
      Object.entries(note.ceremony?.events || {}).some(([key, value]) =>
        key !== 'memo' && value === true
      ) ||
      note.subPhotographer?.videoDvd ||
      note.subPhotographer?.subIphoneSnap ||
      note.photoConceptMemo ||
      note.requestsMemo
    )
  }, [schedule.photoNote])

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
            <div className="relative">
              {hasPhotoNoteData && (
                <span className="absolute inset-0 animate-gentle-ping">
                  <span className="block h-full w-full rounded-full bg-primary" />
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all relative"
                onClick={() => setPhotoNoteOpen(true)}
                title={hasPhotoNoteData ? "촬영노트 (작성됨)" : "촬영노트"}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all"
              onClick={() => setPhotoSequenceOpen(true)}
              title="원판순서"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all"
              onClick={handleGoogleCalendar}
              title="구글 캘린더"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            {user?.naverAccessToken && user?.id?.startsWith('naver_') && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all bg-[#03C75A]/10 hover:bg-[#03C75A]/20 border-[#03C75A]/30"
                onClick={handleNaverCalendarClick}
                title="네이버 캘린더"
              >
                <CalendarPlus className="h-4 w-4 text-[#03C75A]" />
              </Button>
            )}
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

      {/* PhotoSequence Dialog */}
      <PhotoSequenceDialog
        open={photoSequenceOpen}
        onOpenChange={setPhotoSequenceOpen}
        schedule={schedule}
      />

      {/* Naver Calendar Confirm Dialog */}
      <ConfirmDialog
        open={naverCalendarConfirmOpen}
        onOpenChange={setNaverCalendarConfirmOpen}
        title="네이버 캘린더에 추가"
        description={`이 일정을 네이버 캘린더에 추가하시겠습니까?\n추가된 일정은 네이버 캘린더 앱에서 확인하실 수 있습니다.`}
        confirmText="추가"
        onConfirm={handleNaverCalendarConfirm}
      />
    </div>
  )
}
