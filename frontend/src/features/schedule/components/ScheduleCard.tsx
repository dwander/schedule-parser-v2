import type { Schedule, Brand } from '../types/schedule'
import { EditableCell } from './EditableCell'
import { MemoCell } from './MemoCell'
import { DatePickerCell } from './DatePickerCell'
import { TimePickerCell } from './TimePickerCell'
import { TagSelectCell } from './TagSelectCell'
import { PhotoNoteDialog } from './PhotoNoteDialog'
import { PhotoSequenceDialog } from './PhotoSequenceDialog'
import { ImportantMemoDialog } from './ImportantMemoDialog'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useTagOptions } from '../hooks/useTagOptions'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { Button } from '@/components/ui/button'
import { Phone, User, Camera, FileDigit, DollarSign, UserCog, FileText, ListTodo, FolderCheck, Check, Calendar, MoreHorizontal } from 'lucide-react'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { NaverIcon } from '@/components/icons/NaverIcon'
import { AppleIcon } from '@/components/icons/AppleIcon'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { logger } from '@/lib/utils/logger'
import { formatContact, parseNumber, isValidNumber, formatNumber } from '@/lib/utils/formatters'
import { generateFolderName } from '@/lib/utils/folderNameGenerator'

interface ScheduleCardProps {
  schedule: Schedule
  isSelected: boolean
  isDuplicate?: boolean
  isConflict?: boolean
  onToggleSelect: () => void
  onToggleCheckboxVisibility: () => void
  onDeleteTag: (tagValue: string, field: 'brand' | 'album') => void
  cardRef?: React.RefObject<HTMLDivElement | null>
  cardStyle?: React.CSSProperties
}

export function ScheduleCard({ schedule, isSelected, isDuplicate = false, isConflict = false, onToggleSelect, onToggleCheckboxVisibility, onDeleteTag, cardRef, cardStyle }: ScheduleCardProps) {
  const updateSchedule = useUpdateSchedule()
  const { brandOptions, albumOptions } = useTagOptions()
  const { cardColumnVisibility: columnVisibility, enabledCalendars, skipNaverCalendarConfirm, setSkipNaverCalendarConfirm, columnLabels, folderNameFormat, appleCredentials } = useSettingsStore()
  const { user } = useAuthStore()
  const [photoNoteOpen, setPhotoNoteOpen] = useState(false)
  const [photoSequenceOpen, setPhotoSequenceOpen] = useState(false)
  const [importantMemoOpen, setImportantMemoOpen] = useState(false)
  const [naverCalendarConfirmOpen, setNaverCalendarConfirmOpen] = useState(false)
  const [naverLoginPromptOpen, setNaverLoginPromptOpen] = useState(false)
  const [appleCalendarLoading, setAppleCalendarLoading] = useState(false)
  const [appleCredentialsPromptOpen, setAppleCredentialsPromptOpen] = useState(false)

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
      logger.error('네이버 캘린더 추가 실패:', error)
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

  const handleAppleCalendar = async () => {
    // Check if credentials are configured
    if (!appleCredentials.appleId || !appleCredentials.appPassword) {
      setAppleCredentialsPromptOpen(true)
      return
    }

    setAppleCalendarLoading(true)
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

      // 백엔드를 통해 Apple Calendar API 호출
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/api/calendar/apple`,
        {
          apple_id: appleCredentials.appleId,
          app_password: appleCredentials.appPassword,
          subject: `${schedule.location} - ${schedule.couple}`,
          location: schedule.location,
          start_datetime: formatLocalISO(startDate),
          end_datetime: formatLocalISO(endDate),
          description: schedule.memo || ''
        }
      )

      if (response.data.success) {
        toast.success('Apple Calendar에 일정이 추가되었습니다')
      }
    } catch (error: unknown) {
      logger.error('Apple Calendar 추가 실패:', error)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 401) {
          toast.error('Apple ID 또는 앱 전용 비밀번호가 올바르지 않습니다.')
          return
        }
      }
      toast.error('Apple Calendar 추가 중 오류가 발생했습니다')
    } finally {
      setAppleCalendarLoading(false)
    }
  }

  // 폴더명 생성 및 클립보드 복사
  const handleFolderCopy = async () => {
    // 설정된 포맷으로 폴더명 생성
    const folderName = generateFolderName(schedule, folderNameFormat)

    // 클립보드 복사
    try {
      await navigator.clipboard.writeText(folderName)
      toast.success(`폴더명이 복사되었습니다.\n${folderName}`)
    } catch (error) {
      logger.error('클립보드 복사 실패:', error)
      toast.error('클립보드 복사에 실패했습니다')
    }
  }

  // 카드 더블클릭 핸들러 (체크박스 visibility 토글)
  const handleCardDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggleCheckboxVisibility()
  }

  // 중요내용 데이터 존재 여부 확인
  const hasImportantMemo = useMemo(() => {
    return !!(schedule.photoNote?.importantMemo)
  }, [schedule.photoNote?.importantMemo])

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
      ref={cardRef}
      className={`
        rounded-xl border border-t-2 shadow-md
        transition-all duration-300 md:hover:shadow-xl md:hover:scale-[1.02] w-full max-w-full
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${
          isDuplicate
            ? 'bg-warning border-warning-border border-l-4'
            : isConflict
            ? 'bg-error border-error-border border-l-4'
            : 'border-border/50 bg-card'
        }
      `}
      style={{ overflow: 'visible', ...cardStyle }}
      onDoubleClick={handleCardDoubleClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-4 bg-muted/30">
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
            placeholder={columnLabels.location}
            className="font-semibold text-lg !w-auto mb-1"
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
            placeholder={columnLabels.brand}
          />
          <div className="text-xs text-muted-foreground">
            <TagSelectCell
              value={schedule.album || ''}
              options={albumOptions}
              onSave={(value) => {
                updateSchedule.mutate({
                  id: schedule.id,
                  album: value || ''
                })
              }}
              onDelete={(tag) => onDeleteTag(tag, 'album')}
              placeholder={columnLabels.album}
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border/30" />

      {/* Content */}
      <div className="p-5 pt-4 space-y-3">
        {/* Top: Fields with FAB Buttons */}
        <div className="flex gap-3">
          {/* Left: Fields */}
          <div className="flex-1 space-y-3.5 min-w-0">
            {/* Couple */}
            {columnVisibility.couple && (
              <div className="flex items-center gap-2.5">
                <User className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.couple}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      couple: value
                    })
                  }}
                  placeholder={columnLabels.couple}
                  className="!w-auto"
                />
              </div>
            )}

            {/* Contact (카드뷰에서는 데이터가 있을 때만 표시) */}
            {schedule.contact && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.contact}
                  onSave={(value) => {
                    const formatted = value.includes('@') ? value.trim() : formatContact(value)
                    updateSchedule.mutate({
                      id: schedule.id,
                      contact: formatted
                    })
                  }}
                  format={(val) => formatContact(String(val))}
                  placeholder={columnLabels.contact}
                  className="!w-auto"
                />
              </div>
            )}

            {/* Photographer */}
            {columnVisibility.photographer && (
              <div className="flex items-center gap-2.5">
                <Camera className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.photographer || ''}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      photographer: value || ''
                    })
                  }}
                  placeholder={columnLabels.photographer}
                  className="!w-auto"
                />
              </div>
            )}

            {/* Cuts */}
            {columnVisibility.cuts && (
              <div className="flex items-center gap-2.5">
                <FileDigit className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.cuts}
                  onSave={(value) => {
                    const num = parseNumber(value)
                    if (num >= 0) {
                      updateSchedule.mutate({
                        id: schedule.id,
                        cuts: num
                      })
                    }
                  }}
                  validate={isValidNumber}
                  format={formatNumber}
                  placeholder={columnLabels.cuts}
                  className="!w-auto"
                />
              </div>
            )}

            {/* Price */}
            {columnVisibility.price && (
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.price}
                  onSave={(value) => {
                    const num = parseNumber(value)
                    if (num >= 0) {
                      updateSchedule.mutate({
                        id: schedule.id,
                        price: num
                      })
                    }
                  }}
                  validate={isValidNumber}
                  format={formatNumber}
                  placeholder={columnLabels.price}
                  className="!w-auto"
                />
              </div>
            )}

            {/* Manager */}
            {columnVisibility.manager && schedule.manager && (
              <div className="flex items-center gap-2.5">
                <UserCog className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0" />
                <EditableCell
                  value={schedule.manager}
                  onSave={(value) => {
                    updateSchedule.mutate({
                      id: schedule.id,
                      manager: value
                    })
                  }}
                  placeholder={columnLabels.manager}
                  className="!w-auto"
                />
              </div>
            )}
          </div>

          {/* Right: FAB Buttons - 가로형 3그룹 레이아웃 */}
          <div className="flex flex-row gap-2 flex-shrink-0">
            {/* 1. 중요 내용 그룹 */}
            <div className="relative group">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                onClick={() => setImportantMemoOpen(true)}
                title={hasImportantMemo ? "중요 내용 (작성됨)" : "중요 내용"}
              >
                <Check className="h-[1.1rem] w-[1.1rem]" />
              </Button>
            </div>

            {/* 2. 캘린더 동기화 그룹 */}
            {(enabledCalendars.google || enabledCalendars.naver || enabledCalendars.apple) && (() => {
              const enabledCount = [enabledCalendars.google, enabledCalendars.naver, enabledCalendars.apple].filter(Boolean).length

              // 1개만 활성화된 경우: 해당 서비스 버튼만 표시
              if (enabledCount === 1) {
                if (enabledCalendars.google) {
                  return (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                      onClick={handleGoogleCalendar}
                      title="구글 캘린더"
                    >
                      <GoogleIcon className="h-[1.05rem] w-[1.05rem]" />
                    </Button>
                  )
                }
                if (enabledCalendars.naver) {
                  return (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                      onClick={handleNaverCalendarClick}
                      title="네이버 캘린더"
                    >
                      <NaverIcon className="h-[1.05rem] w-[1.05rem] text-naver" />
                    </Button>
                  )
                }
                if (enabledCalendars.apple) {
                  return (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                      onClick={handleAppleCalendar}
                      disabled={appleCalendarLoading}
                      title="Apple 캘린더"
                    >
                      <AppleIcon className="h-[1.525rem] w-[1.525rem]" />
                    </Button>
                  )
                }
              }

              // 여러 개 활성화된 경우: 캘린더 아이콘, 호버 시 펼침
              return (
                <div className="flex flex-col gap-2 group">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                    title="캘린더 동기화"
                  >
                    <Calendar className="h-[1.1rem] w-[1.1rem]" />
                  </Button>
                  {/* 호버 시 펼쳐지는 서비스 버튼들 */}
                  <div className="flex flex-col gap-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-[200px] group-hover:opacity-100 transition-all duration-200">
                    {enabledCalendars.google && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                        onClick={handleGoogleCalendar}
                        title="구글 캘린더"
                      >
                        <GoogleIcon className="h-[1.05rem] w-[1.05rem]" />
                      </Button>
                    )}
                    {enabledCalendars.naver && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                        onClick={handleNaverCalendarClick}
                        title="네이버 캘린더"
                      >
                        <NaverIcon className="h-[1.05rem] w-[1.05rem] text-naver" />
                      </Button>
                    )}
                    {enabledCalendars.apple && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                        onClick={handleAppleCalendar}
                        disabled={appleCalendarLoading}
                        title="Apple 캘린더"
                      >
                        <AppleIcon className="h-[1.525rem] w-[1.525rem]" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 3. 기타기능 그룹 */}
            <div className="flex flex-col gap-2 group">
              <div className="relative">
                {/* 데이터 있을 때 배지 표시 */}
                {hasPhotoNoteData && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background z-10" />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full transition-all relative shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                  title="기타기능"
                >
                  <MoreHorizontal className="h-[1.1rem] w-[1.1rem]" />
                </Button>
              </div>
              {/* 호버 시 펼쳐지는 기능 버튼들 */}
              <div className="flex flex-col gap-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-[200px] group-hover:opacity-100 transition-all duration-200">
                <div className="relative">
                  {/* 데이터 있을 때 배지 표시 */}
                  {hasPhotoNoteData && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background z-10" />
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full transition-all relative shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                    onClick={() => setPhotoNoteOpen(true)}
                    title={hasPhotoNoteData ? "촬영노트 (작성됨)" : "촬영노트"}
                  >
                    <FileText className="h-[1.1rem] w-[1.1rem]" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                  onClick={() => setPhotoSequenceOpen(true)}
                  title="원판순서"
                >
                  <ListTodo className="h-[1.1rem] w-[1.1rem]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg bg-background/95 backdrop-blur-sm"
                  onClick={handleFolderCopy}
                  title="폴더명 복사"
                >
                  <FolderCheck className="h-[1.1rem] w-[1.1rem]" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Important Memo - Full width */}
        {hasImportantMemo && (
          <div className="pt-3">
            <button
              onClick={() => setImportantMemoOpen(true)}
              className="w-full p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left flex items-start gap-2.5"
            >
              <Check className="h-[1.1rem] w-[1.1rem] text-muted-foreground/70 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/80 whitespace-pre-wrap break-words line-clamp-3 flex-1">
                {schedule.photoNote?.importantMemo}
              </div>
            </button>
          </div>
        )}

        {/* Memo - Full width */}
        {columnVisibility.memo && (
          <div className="pt-3 border-t border-border/30">
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

      {/* ImportantMemo Dialog */}
      <ImportantMemoDialog
        open={importantMemoOpen}
        onOpenChange={setImportantMemoOpen}
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

      {/* Apple Calendar Credentials Prompt Dialog */}
      <AlertDialog
        open={appleCredentialsPromptOpen}
        onOpenChange={setAppleCredentialsPromptOpen}
        title="Apple Calendar 설정 필요"
        description="Apple Calendar에 일정을 추가하려면 설정 메뉴에서 Apple ID와 앱 전용 비밀번호를 입력해주세요."
      />
    </div>
  )
}
