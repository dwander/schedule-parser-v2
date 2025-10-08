import type { Schedule, Brand } from '../types/schedule'
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
import { AlertDialog } from '@/components/common/AlertDialog'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarPlus, Phone, User, Camera, FileDigit, DollarSign, UserCog, FileText, ListTodo, FolderCheck } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { BRAND_FOLDER_PREFIX_MAP } from '@/lib/constants/brands'
import { getApiUrl } from '@/lib/constants/api'
import { UI_TIMERS } from '@/lib/constants/timing'

interface ScheduleCardProps {
  schedule: Schedule
  isSelected: boolean
  isDuplicate?: boolean
  isConflict?: boolean
  onToggleSelect: () => void
  onToggleCheckboxVisibility: () => void
  onDeleteTag: (tagValue: string, field: 'brand' | 'album') => void
}

export function ScheduleCard({ schedule, isSelected, isDuplicate = false, isConflict = false, onToggleSelect, onToggleCheckboxVisibility, onDeleteTag }: ScheduleCardProps) {
  const updateSchedule = useUpdateSchedule()
  const { brandOptions, albumOptions } = useTagOptions()
  const { cardColumnVisibility: columnVisibility, enabledCalendars, skipNaverCalendarConfirm, setSkipNaverCalendarConfirm } = useSettingsStore()
  const { user } = useAuthStore()
  const [photoNoteOpen, setPhotoNoteOpen] = useState(false)
  const [photoSequenceOpen, setPhotoSequenceOpen] = useState(false)
  const [naverCalendarConfirmOpen, setNaverCalendarConfirmOpen] = useState(false)
  const [naverLoginPromptOpen, setNaverLoginPromptOpen] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

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
    // 네이버 캘린더 연동 확인
    if (!user?.naverAccessToken) {
      setNaverLoginPromptOpen(true)
      return
    }

    // 설정에서 확인 다이얼로그를 건너뛰도록 설정되어 있으면 바로 실행
    if (skipNaverCalendarConfirm) {
      handleNaverCalendarConfirm()
      return
    }

    // 확인 다이얼로그 열기
    setNaverCalendarConfirmOpen(true)
  }

  const handleNaverCalendarConfirm = async () => {
    if (!user?.naverAccessToken) return

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
      const apiUrl = getApiUrl()
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
    } catch (error: unknown) {
      console.error('네이버 캘린더 추가 실패:', error)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 401) {
          toast.error('네이버 로그인이 만료되었습니다. 다시 로그인해주세요.')
          return
        }
      }
      toast.error('네이버 캘린더 추가 중 오류가 발생했습니다')
    }
  }

  // 폴더명 생성 및 클립보드 복사
  const handleFolderCopy = async () => {
    // 브랜드 매핑
    const brandPrefix = BRAND_FOLDER_PREFIX_MAP[schedule.brand] || ''

    // 시간 형식 변환: "14:00" → "14시", "14:30" → "14시30분"
    const [hours, minutes] = schedule.time.split(':')
    const timeStr = minutes === '00' ? `${hours}시` : `${hours}시${minutes}분`

    // 폴더명 구성
    let folderName = ''
    if (brandPrefix) {
      folderName = `${brandPrefix} ${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
    } else {
      folderName = `${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
    }

    // 작가 정보 추가
    if (schedule.photographer) {
      if (schedule.cuts && schedule.cuts > 0) {
        folderName += ` - ${schedule.photographer}(${schedule.cuts})`
      } else {
        folderName += ` - ${schedule.photographer}`
      }
    } else if (schedule.cuts && schedule.cuts > 0) {
      folderName += ` - (${schedule.cuts})`
    }

    // 클립보드 복사
    try {
      await navigator.clipboard.writeText(folderName)
      toast.success(`폴더명이 복사되었습니다.\n${folderName}`)
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
      toast.error('클립보드 복사에 실패했습니다')
    }
  }

  // 카드 더블클릭 핸들러 (체크박스 visibility 토글)
  const handleCardDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggleCheckboxVisibility()
  }

  // 카드 롱프레스 핸들러 (체크박스 visibility 토글)
  const handleCardPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement

    // EditableCell 내부 input이나 버튼 클릭은 제외 (체크박스는 허용)
    if (target.closest('button, [role="button"]') ||
        (target.tagName === 'INPUT' && target.getAttribute('type') !== 'checkbox')) {
      return
    }

    longPressTimerRef.current = setTimeout(() => {
      onToggleCheckboxVisibility()
    }, UI_TIMERS.LONG_PRESS)
  }

  const handleHeaderPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
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
      onDoubleClick={handleCardDoubleClick}
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleHeaderPointerUp}
      onPointerLeave={handleHeaderPointerUp}
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

        {/* Center: Location + Date/Time (카드뷰에서는 항상 표시) */}
        <div className="flex-1 min-w-0 flex flex-col items-start">
          <EditableCell
            value={schedule.location}
            onSave={(value) => {
              updateSchedule.mutate({
                id: schedule.id,
                location: value
              })
            }}
            placeholder="장소"
            className="font-medium text-base !w-auto mb-1"
          />
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
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

        {/* Right: Brand + Album (카드뷰에서는 항상 표시) */}
        <div className="flex-shrink-0 space-y-1 text-right">
          <TagSelectCell
            value={schedule.brand}
            options={brandOptions}
            onSave={(value) => {
              updateSchedule.mutate({
                id: schedule.id,
                brand: (value || undefined) as Brand | undefined
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
                  album: value || ''
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
            {columnVisibility.couple && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <EditableCell
                  value={schedule.couple}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      couple: value
                    })
                  }}
                  placeholder="신랑신부"
                  className="!w-auto"
                />
              </div>
            )}

            {/* Contact (카드뷰에서는 데이터가 있을 때만 표시) */}
            {schedule.contact && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  className="!w-auto"
                />
              </div>
            )}

            {/* Photographer */}
            {columnVisibility.photographer && (
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <EditableCell
                  value={schedule.photographer}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      photographer: value || ''
                    })
                  }}
                  placeholder="작가"
                  className="!w-auto"
                />
              </div>
            )}

            {/* Cuts */}
            {columnVisibility.cuts && (
              <div className="flex items-center gap-2">
                <FileDigit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  className="!w-auto"
                />
              </div>
            )}

            {/* Price */}
            {columnVisibility.price && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  className="!w-auto"
                />
              </div>
            )}

            {/* Manager */}
            {columnVisibility.manager && schedule.manager && (
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <EditableCell
                  value={schedule.manager}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      manager: value
                    })
                  }}
                  placeholder="계약자"
                  className="!w-auto"
                />
              </div>
            )}
          </div>

          {/* Right: FAB Buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <div className="relative">
              {hasPhotoNoteData && (
                <span className="absolute inset-0 animate-gentle-ping">
                  <span className="block h-full w-full rounded-full bg-primary" />
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full transition-all relative"
                onClick={() => setPhotoNoteOpen(true)}
                title={hasPhotoNoteData ? "촬영노트 (작성됨)" : "촬영노트"}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full transition-all"
              onClick={() => setPhotoSequenceOpen(true)}
              title="원판순서"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
            {(enabledCalendars.google || enabledCalendars.naver) && (
              <div className="flex gap-2">
                {enabledCalendars.google && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full transition-all"
                    onClick={handleGoogleCalendar}
                    title="구글 캘린더"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
                {enabledCalendars.naver && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full transition-all"
                    onClick={handleNaverCalendarClick}
                    title="네이버 캘린더"
                  >
                    <CalendarPlus className="h-4 w-4 text-[#03C75A]" />
                  </Button>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full transition-all"
              onClick={handleFolderCopy}
              title="폴더명 복사"
            >
              <FolderCheck className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Memo - Full width */}
        {columnVisibility.memo && (
          <div className="pt-2 border-t border-border">
            <MemoCell
              value={schedule.memo || ''}
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
        showDontAskAgain={true}
        onDontAskAgainChange={setSkipNaverCalendarConfirm}
      />

      {/* Naver Calendar Link Prompt Dialog */}
      <AlertDialog
        open={naverLoginPromptOpen}
        onOpenChange={setNaverLoginPromptOpen}
        title="네이버 캘린더 연동 필요"
        description="네이버 캘린더에 일정을 추가하려면 설정 메뉴에서 네이버 캘린더를 연동해주세요."
      />
    </div>
  )
}
