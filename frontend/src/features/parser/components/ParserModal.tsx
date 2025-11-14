import { useState, useCallback, useEffect, useRef } from 'react'
import { ContentModal } from '@/components/common/ContentModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react'
import { useBatchAddSchedules, useUpdateSchedule } from '@/features/schedule/hooks/useSchedules'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'
import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { logger } from '@/lib/utils/logger'
import type { NewSchedule, Schedule } from '@/features/schedule/types/schedule'
import { DEBOUNCE } from '@/lib/constants/timing'
import { convertParsedDataToSchedules } from '../utils/convertParsedData'
import { useParserEngine } from '../hooks/useParserEngine'
import type { ParserEngine } from '../hooks/useParserEngine'
import { ManualScheduleForm } from './ManualScheduleForm'
import { ParserEngineSelector } from './ParserEngineSelector'

interface ParserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSchedules: Schedule[]
}

export function ParserModal({ open, onOpenChange, existingSchedules }: ParserModalProps) {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState('text')
  const [engine, setEngine] = useState<ParserEngine>('classic')
  const [syncToCalendar, setSyncToCalendar] = useState(false)
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false)
  const [skipCalendarConfirm, setSkipCalendarConfirm] = useState(false)
  const [calendarWarningOpen, setCalendarWarningOpen] = useState(false)
  const [calendarWarningMessage, setCalendarWarningMessage] = useState('')
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const batchAddSchedules = useBatchAddSchedules()
  const updateSchedule = useUpdateSchedule()
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuthStore()
  const { enabledCalendars, appleCredentials, calendarEventDuration } = useSettingsStore()
  const isAdmin = user?.isAdmin || false

  // 파서 엔진 훅
  const {
    isParsing,
    parsedData,
    duplicates,
    error,
    parsingStep,
    parseFromText,
    parseFromFile,
    reset
  } = useParserEngine(existingSchedules)

  // 직접 입력 폼 상태
  const [manualForm, setManualForm] = useState({
    date: '',
    time: '',
    location: '',
    groom: '',
    bride: '',
    contact: '',
    memo: ''
  })

  // 텍스트 입력 시 자동 파싱 (디바운스)
  useEffect(() => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }

    if (!text.trim()) {
      reset()
      return
    }

    parseTimerRef.current = setTimeout(() => {
      parseFromText(text, engine)
    }, DEBOUNCE.PARSER_AUTO)

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current)
      }
    }
  }, [text, engine, parseFromText, reset])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.eml')) {
      toast.error('.txt 또는 .eml 파일만 업로드할 수 있습니다')
      return
    }

    await parseFromFile(file, engine)
  }, [engine, parseFromFile])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await parseFromFile(file, engine)
  }, [engine, parseFromFile])

  // 캘린더 동기화 체크박스 변경 핸들러
  const handleSyncToCalendarChange = useCallback((checked: boolean) => {
    if (!checked) {
      setSyncToCalendar(false)
      return
    }

    // 유효성 검사 (구글 제외)
    const enabledCalendarList = []
    if (enabledCalendars.naver && user?.naverAccessToken) enabledCalendarList.push('네이버')
    if (enabledCalendars.apple && appleCredentials.appleId && appleCredentials.appPassword) enabledCalendarList.push('애플')

    // 선택된 캘린더가 없는 경우
    if (enabledCalendarList.length === 0) {
      let warningMsg = '캘린더 동기화를 하려면 먼저 설정이 필요합니다.\n\n'

      if (!enabledCalendars.naver && !enabledCalendars.apple) {
        warningMsg += '설정 → 동기화에서 네이버 또는 애플 캘린더를 선택해주세요.\n(구글 캘린더는 자동 동기화가 지원되지 않습니다)'
      } else {
        const issues = []
        if (enabledCalendars.naver && !user?.naverAccessToken) {
          issues.push('• 네이버: 계정 연동이 필요합니다')
        }
        if (enabledCalendars.apple && (!appleCredentials.appleId || !appleCredentials.appPassword)) {
          issues.push('• 애플: iCloud 계정 설정이 필요합니다')
        }
        warningMsg += issues.join('\n')
      }

      setCalendarWarningMessage(warningMsg)
      setCalendarWarningOpen(true)
      return
    }

    // 확인 다이얼로그 표시 (다시 묻지 않기 설정 확인)
    const storedSkip = localStorage.getItem('skipParserCalendarConfirm')
    if (storedSkip === 'true') {
      setSyncToCalendar(true)
    } else {
      const calendarNames = enabledCalendarList.join(', ')
      setCalendarWarningMessage(`${calendarNames} 캘린더에 동기화하시겠습니까?`)
      setCalendarConfirmOpen(true)
    }
  }, [enabledCalendars, user, appleCredentials])

  // 캘린더 동기화 확인 핸들러
  const handleConfirmCalendarSync = useCallback(() => {
    setSyncToCalendar(true)
    setCalendarConfirmOpen(false)

    // "다시 묻지 않기" 설정 저장
    if (skipCalendarConfirm) {
      localStorage.setItem('skipParserCalendarConfirm', 'true')
    }
  }, [skipCalendarConfirm])

  // 단일 스케줄에 대한 캘린더 동기화 실행 (구글 제외)
  const syncScheduleToCalendars = useCallback(async (schedule: { date: string; time: string; location: string; couple: string; memo?: string }) => {
    const apiUrl = getApiUrl()
    let successCount = 0
    let failCount = 0
    let authError = false

    // 날짜/시간 파싱
    const [year, month, day] = schedule.date.split('.').map(Number)
    const [hours, minutes] = schedule.time.split(':').map(Number)

    // 시작/종료 시간 (설정된 오프셋(분) 적용)
    // Date 생성자는 분이 60을 초과하거나 음수여도 자동으로 시간/날짜를 조정
    const startDate = new Date(year, month - 1, day, hours, minutes + calendarEventDuration.startOffset)
    const endDate = new Date(year, month - 1, day, hours, minutes + calendarEventDuration.endOffset)

    // 로컬 시간을 ISO 형식으로 변환 (UTC 변환 없이)
    const formatLocalISO = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d}T${h}:${min}:00`
    }

    // 네이버 캘린더 (백엔드가 DB에서 토큰 자동 확인/갱신)
    if (enabledCalendars.naver && user?.naverAccessToken) {
      try {
        const response = await axios.post(
          `${apiUrl}/api/calendar/naver`,
          {
            user_id: user.id,
            subject: `${schedule.location} - ${schedule.couple}`,
            location: schedule.location,
            start_datetime: formatLocalISO(startDate),
            end_datetime: formatLocalISO(endDate),
            description: schedule.memo || ''
          }
        )

        if (response.data.result === 'success') {
          successCount++
        } else {
          failCount++
        }
      } catch (error: unknown) {
        logger.error('네이버 캘린더 추가 실패:', error)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { detail?: string } } }
          if (axiosError.response?.status === 401) {
            authError = true
          }
        }
        failCount++
      }
    }

    // 애플 캘린더
    if (enabledCalendars.apple && appleCredentials.appleId && appleCredentials.appPassword) {
      try {
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
          successCount++
        }
      } catch (error: unknown) {
        logger.error('Apple Calendar 추가 실패:', error)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } }
          if (axiosError.response?.status === 401) {
            authError = true
          }
        }
        failCount++
      }
    }

    return { successCount, failCount, authError }
  }, [enabledCalendars, user, appleCredentials, calendarEventDuration])

  // 중복 스케줄 업데이트 핸들러
  const handleUpdateDuplicates = useCallback(() => {
    if (!duplicates || duplicates.length === 0) return

    setDuplicateConfirmOpen(false)

    // 각 중복 스케줄을 업데이트
    let successCount = 0
    let failCount = 0

    duplicates.forEach(({ parsed, existing }) => {
      const updatedSchedule = {
        id: existing.id,
        date: parsed.date,
        time: parsed.time,
        location: parsed.location,
        couple: parsed.couple,
        contact: parsed.contact,
        memo: parsed.memo,
      }

      updateSchedule.mutate(updatedSchedule, {
        onSuccess: () => {
          successCount++
          if (successCount === duplicates.length) {
            toast.success(`${successCount}개의 스케줄이 업데이트되었습니다`)
            onOpenChange(false)
            setText('')
            reset()
          }
        },
        onError: () => {
          failCount++
          if (successCount + failCount === duplicates.length) {
            if (successCount > 0) {
              toast.success(`${successCount}개의 스케줄이 업데이트되었습니다`)
            }
            if (failCount > 0) {
              toast.error(`${failCount}개의 스케줄 업데이트에 실패했습니다`)
            }
            onOpenChange(false)
            setText('')
            reset()
          }
        }
      })
    })
  }, [duplicates, updateSchedule, onOpenChange, reset])

  const handleSave = () => {
    // 중복 스케줄만 있는 경우 - 업데이트 확인 다이얼로그 표시
    if (duplicates && duplicates.length > 0 && (!parsedData || parsedData.length === 0)) {
      setDuplicateConfirmOpen(true)
      return
    }

    if (activeTab === 'manual') {
      // 직접 입력 모드
      if (!manualForm.date || !manualForm.time || !manualForm.location) {
        toast.error('날짜, 시간, 장소는 필수 입력 항목입니다')
        return
      }

      // 신랑신부 합치기
      const couple = [manualForm.groom, manualForm.bride].filter(Boolean).join(' ')

      const newSchedule = {
        date: manualForm.date,
        time: manualForm.time,
        location: manualForm.location,
        couple: couple,
        contact: manualForm.contact || undefined,
        memo: manualForm.memo || undefined,
        isDuplicate: false,
      } as NewSchedule

      batchAddSchedules.mutate([newSchedule], {
        onSuccess: async () => {
          toast.success('스케줄이 추가되었습니다')

          // 캘린더 동기화
          if (syncToCalendar) {
            const { successCount, failCount, authError } = await syncScheduleToCalendars({
              date: newSchedule.date,
              time: newSchedule.time,
              location: newSchedule.location,
              couple: newSchedule.couple,
              memo: newSchedule.memo
            })

            if (authError) {
              toast.error('네이버 캘린더 연동이 필요합니다.\n설정에서 네이버 계정을 연동해주세요.')
            } else {
              if (successCount > 0) {
                toast.success(`${successCount}개의 캘린더에 동기화되었습니다`)
              }
              if (failCount > 0) {
                toast.error(`${failCount}개의 캘린더 동기화에 실패했습니다`)
              }
            }
          }

          onOpenChange(false)
          // 리셋
          setManualForm({
            date: '',
            time: '',
            location: '',
            groom: '',
            bride: '',
            contact: '',
            memo: ''
          })
        },
        onError: () => {
          toast.error('스케줄 저장 중 오류가 발생했습니다')
        }
      })
    } else {
      // 파싱 모드
      if (!parsedData || parsedData.length === 0) return

      // ParsedScheduleData[]를 NewSchedule[]로 변환
      const schedulesToAdd = convertParsedDataToSchedules(parsedData)

      batchAddSchedules.mutate(schedulesToAdd, {
        onSuccess: async () => {
          toast.success(`${parsedData.length}개의 스케줄이 추가되었습니다`)

          // 캘린더 동기화
          if (syncToCalendar) {
            let totalSuccess = 0
            let totalFail = 0
            let hasAuthError = false

            for (const schedule of schedulesToAdd) {
              try {
                const { successCount, failCount, authError } = await syncScheduleToCalendars({
                  date: schedule.date,
                  time: schedule.time,
                  location: schedule.location,
                  couple: schedule.couple,
                  memo: schedule.memo
                })
                totalSuccess += successCount
                totalFail += failCount
                if (authError) hasAuthError = true
              } catch (error) {
                totalFail++
              }
            }

            if (hasAuthError) {
              toast.error('네이버 캘린더 연동이 필요합니다.\n설정에서 네이버 계정을 연동해주세요.')
            } else {
              if (totalSuccess > 0) {
                toast.success(`${totalSuccess}건의 캘린더 동기화가 완료되었습니다`)
              }
              if (totalFail > 0) {
                toast.error(`${totalFail}건의 캘린더 동기화에 실패했습니다`)
              }
            }
          }

          onOpenChange(false)
          // 리셋
          setText('')
          reset()
        },
        onError: () => {
          toast.error('스케줄 저장 중 오류가 발생했습니다')
        }
      })
    }
  }

  const handleReset = useCallback(() => {
    setText('')
    reset()
  }, [reset])

  const handleClose = useCallback(() => {
    setText('')
    reset()
    setManualForm({
      date: '',
      time: '',
      location: '',
      groom: '',
      bride: '',
      contact: '',
      memo: ''
    })
    onOpenChange(false)
  }, [onOpenChange, reset])

  // 캘린더 동기화 체크박스 렌더링 함수
  const renderCalendarCheckbox = (id: string) => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={syncToCalendar}
        onCheckedChange={handleSyncToCalendarChange}
      />
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        일정을 캘린더에 동기화
      </label>
    </div>
  )

  return (
    <ContentModal
      open={open}
      onOpenChange={handleClose}
      size="fullscreen-mobile"
      className="sm:max-w-2xl sm:w-[80%]"
      title="스케줄 가져오기"
      showFooter={true}
      footerContent={
        <div className="flex gap-2 w-full">
          {activeTab === 'text' && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-2"
              disabled={!text.trim()}
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={
              activeTab === 'manual'
                ? !manualForm.date || !manualForm.time || !manualForm.location || isParsing
                : ((!parsedData || parsedData.length === 0) && (!duplicates || duplicates.length === 0)) || isParsing
            }
            className="flex-1"
          >
            {activeTab === 'manual'
              ? '추가하기'
              : duplicates && duplicates.length > 0 && (!parsedData || parsedData.length === 0)
              ? `${duplicates.length}개 업데이트하기`
              : parsedData
              ? `${parsedData.length}개 추가하기`
              : '추가하기'}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="gap-2">
            <FileText className="h-4 w-4" />
            텍스트 입력
          </TabsTrigger>
          <TabsTrigger value="file" className="gap-2">
            <Upload className="h-4 w-4" />
            파일 업로드
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="h-4 w-4" />
            직접 입력
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex flex-col gap-4">
          {/* 파서 엔진 선택 */}
          <ParserEngineSelector
            engine={engine}
            onEngineChange={setEngine}
            isAdmin={isAdmin}
          />

          <div className="relative min-h-[300px]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="카카오톡 대화방에서 내보낸 스케줄 텍스트를 붙여넣으세요..."
              className="w-full h-full min-h-[300px] px-3 py-2 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isParsing}
            />
            {isParsing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {parsingStep === 'classic' && 'Classic으로 시도 중...'}
                    {parsingStep === 'gpt' && 'GPT-4로 재분석 중...'}
                    {!parsingStep && '파싱 중...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="file" className="flex flex-col gap-4">
          {/* 파서 엔진 선택 */}
          <ParserEngineSelector
            engine={engine}
            onEngineChange={setEngine}
            isAdmin={isAdmin}
            id="parser-engine-file"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`min-h-[300px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-center">
              <p className="text-sm font-medium">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                카카오톡 대화방에서 내보내기한 스케줄 데이터를 업로드하세요
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .txt 및 .eml 파일 지원
              </p>
            </div>
            <input
              type="file"
              accept=".txt,.eml"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={isParsing}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" disabled={isParsing} asChild>
                <span>파일 선택</span>
              </Button>
            </label>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="flex flex-col gap-4">
          <ManualScheduleForm formData={manualForm} onChange={setManualForm} />
        </TabsContent>

        {/* 캘린더 동기화 체크박스 */}
        {renderCalendarCheckbox('sync-to-calendar')}

        {/* 결과 영역 */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {parsedData && parsedData.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 text-primary rounded-md">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {parsedData.length}개의 스케줄을 찾았습니다
              </p>
              <p className="text-xs mt-1 opacity-80">
                날짜: {parsedData.map(d => d.date).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </p>
            </div>
          </div>
        )}

        {duplicates && duplicates.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-md">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {duplicates.length}개의 중복 스케줄이 발견되었습니다
              </p>
              <p className="text-xs mt-1 opacity-80">
                동일한 날짜, 시간, 장소의 스케줄이 이미 존재합니다. {parsedData && parsedData.length > 0 ? '새 스케줄만 추가되거나' : ''} 업데이트를 선택할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </Tabs>

      {/* 캘린더 동기화 확인 다이얼로그 */}
      <ConfirmDialog
        open={calendarConfirmOpen}
        onOpenChange={setCalendarConfirmOpen}
        title="캘린더 동기화"
        description={calendarWarningMessage}
        confirmText="동기화"
        cancelText="취소"
        onConfirm={handleConfirmCalendarSync}
        showDontAskAgain={true}
        onDontAskAgainChange={setSkipCalendarConfirm}
      />

      {/* 캘린더 설정 필요 경고 다이얼로그 */}
      <AlertDialog
        open={calendarWarningOpen}
        onOpenChange={setCalendarWarningOpen}
        title="설정 필요"
        description={calendarWarningMessage}
      />

      {/* 중복 스케줄 업데이트 확인 다이얼로그 */}
      <ConfirmDialog
        open={duplicateConfirmOpen}
        onOpenChange={setDuplicateConfirmOpen}
        title="중복 스케줄 업데이트"
        description={
          duplicates && duplicates.length > 0
            ? `${duplicates.length}개의 중복 스케줄이 발견되었습니다.\n\n기존 스케줄을 새로운 내용으로 업데이트하시겠습니까?`
            : ''
        }
        confirmText="업데이트"
        cancelText="취소"
        onConfirm={handleUpdateDuplicates}
      />
    </ContentModal>
  )
}
