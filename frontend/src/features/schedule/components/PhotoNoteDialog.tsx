import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useUpdateSchedule } from '../hooks/useSchedules'
import type { Schedule, PhotoNote } from '../types/schedule'
import { cn } from '@/lib/utils'
import {
  Scissors,
  Clock,
  Users,
  Sparkles,
  Camera,
  Palette,
  MessageSquare,
  AlertCircle,
  FileText
} from 'lucide-react'

interface PhotoNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: Schedule
}

// Section Card Component (컴포넌트 외부로 이동)
function SectionCard({
  icon: Icon,
  title,
  children,
  show = true,
  isEditMode
}: {
  icon: any
  title: string
  children: React.ReactNode
  show?: boolean
  isEditMode: boolean
}) {
  if (!show) return null

  return (
    <div className={cn(
      "group",
      !isEditMode && "rounded-lg border bg-card p-4 transition-all hover:shadow-sm"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md ${isEditMode ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${isEditMode ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <h3 className={`font-semibold ${isEditMode ? 'text-base' : 'text-sm text-muted-foreground'}`}>
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

// 기본 데이터 구조
const defaultPhotoNote: PhotoNote = {
  importantMemo: '',
  makeupShop: {
    name: '',
    departureTime: '',
    arrivalTime: ''
  },
  dress: {
    type: '',
    material: '',
    company: ''
  },
  familyRelations: {
    groomFamily: '',
    brideFamily: ''
  },
  ceremony: {
    host: {
      type: '',
      memo: ''
    },
    events: {
      blessing: false,
      congratulatorySpeech: false,
      congratulatorySong: false,
      congratulatoryDance: false,
      flowerGirl: false,
      ringExchange: false,
      videoPlay: false,
      flashCut: false,
      bouquetCut: false,
      flowerShower: false,
      memo: ''
    }
  },
  subPhotographer: {
    videoDvd: '',
    subIphoneSnap: ''
  },
  photoConceptMemo: '',
  requestsMemo: ''
}

// Deep merge 유틸리티
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T> | undefined): T {
  if (!source) return target

  const result = { ...target }

  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue || {}, sourceValue as any)
    } else {
      result[key] = sourceValue as any
    }
  }

  return result
}

export function PhotoNoteDialog({ open, onOpenChange, schedule }: PhotoNoteDialogProps) {
  const updateSchedule = useUpdateSchedule()

  const initialData = useMemo(
    () => deepMerge(defaultPhotoNote, schedule.photoNote),
    [schedule.photoNote]
  )

  const [isEditMode, setIsEditMode] = useState(false)
  const [noteData, setNoteData] = useState<PhotoNote>(initialData)

  useEffect(() => {
    // 편집 중이 아닐 때만 서버 데이터로 업데이트
    if (!isEditMode) {
      const merged = deepMerge(defaultPhotoNote, schedule.photoNote)
      setNoteData(merged)
    }
  }, [schedule.photoNote, isEditMode])

  const hasData = useMemo(() => {
    return !!(
      noteData.importantMemo ||
      noteData.makeupShop?.name ||
      noteData.makeupShop?.departureTime ||
      noteData.makeupShop?.arrivalTime ||
      noteData.dress?.type ||
      noteData.dress?.material ||
      noteData.dress?.company ||
      noteData.familyRelations?.groomFamily ||
      noteData.familyRelations?.brideFamily ||
      noteData.ceremony?.host?.memo ||
      noteData.ceremony?.events?.memo ||
      Object.entries(noteData.ceremony?.events || {}).some(([key, value]) =>
        key !== 'memo' && value === true
      ) ||
      noteData.subPhotographer?.videoDvd ||
      noteData.subPhotographer?.subIphoneSnap ||
      noteData.photoConceptMemo ||
      noteData.requestsMemo
    )
  }, [noteData])

  const hasAnyMakeupData = !!(noteData.makeupShop?.name || noteData.makeupShop?.departureTime || noteData.makeupShop?.arrivalTime)
  const hasAnyDressData = !!(noteData.dress?.type || noteData.dress?.material || noteData.dress?.company)
  const hasAnyFamilyData = !!(noteData.familyRelations?.groomFamily || noteData.familyRelations?.brideFamily)
  const hasAnyCeremonyHostData = !!(
    (noteData.ceremony?.host?.type && noteData.ceremony?.host?.type !== '') ||
    noteData.ceremony?.host?.memo
  )
  const hasAnyCeremonyEventsData = !!(
    noteData.ceremony?.events?.memo ||
    Object.entries(noteData.ceremony?.events || {}).some(([key, value]) => key !== 'memo' && value === true)
  )
  const hasAnySubPhotographerData = !!(noteData.subPhotographer?.videoDvd || noteData.subPhotographer?.subIphoneSnap)

  useEffect(() => {
    if (open) {
      setIsEditMode(false)

      // 다이얼로그 열릴 때 모든 textarea 높이 초기화
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea')
        textareas.forEach((textarea) => {
          if (textarea.value) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
          }
        })
      }, 100)
    }
  }, [open])

  // 화살표 문자 자동 치환
  const replaceArrows = (value: string): string => {
    return value.replace(/->/g, '→').replace(/<-/g, '←')
  }

  // 화살표 치환 + 커서 위치 보존 핸들러
  const handleArrowReplacement = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    path: string
  ) => {
    const input = e.target
    const cursorPos = input.selectionStart || 0
    const oldValue = input.value

    // 커서 위치 기준으로 앞뒤 분리하여 치환
    const beforeCursor = oldValue.substring(0, cursorPos)
    const afterCursor = oldValue.substring(cursorPos)

    const newBeforeCursor = replaceArrows(beforeCursor)
    const newAfterCursor = replaceArrows(afterCursor)

    const newValue = newBeforeCursor + newAfterCursor
    const newCursorPos = newBeforeCursor.length

    updateFieldLocal(path, newValue)

    // 치환이 발생했으면 커서 위치 복원
    if (oldValue !== newValue) {
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos)
      })
    }
  }

  // Textarea auto-resize
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    target.style.height = 'auto'
    target.style.height = `${target.scrollHeight}px`
  }

  const updateFieldLocal = (path: string, value: any) => {
    const pathArray = path.split('.')
    const newData = { ...noteData }

    let current: any = newData
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {}
      }
      current[pathArray[i]] = { ...current[pathArray[i]] }
      current = current[pathArray[i]]
    }

    current[pathArray[pathArray.length - 1]] = value
    setNoteData(newData)
  }

  // 모든 문자열 값을 trim 처리하는 헬퍼 함수
  const trimPhotoNoteData = (data: any): any => {
    if (typeof data === 'string') {
      return data.trim()
    }
    if (Array.isArray(data)) {
      return data.map(trimPhotoNoteData)
    }
    if (data !== null && typeof data === 'object') {
      const trimmed: any = {}
      for (const key in data) {
        trimmed[key] = trimPhotoNoteData(data[key])
      }
      return trimmed
    }
    return data
  }

  const saveField = () => {
    const trimmedData = trimPhotoNoteData(noteData)
    console.log('💾 Saving photoNote:', trimmedData)
    updateSchedule.mutate({
      id: schedule.id,
      photoNote: trimmedData
    })
  }

  const toggleEvent = (eventKey: string) => {
    const current = (noteData.ceremony?.events as any)?.[eventKey]
    updateFieldLocal(`ceremony.events.${eventKey}`, !current)
  }

  const getValue = (path: string): any => {
    const pathArray = path.split('.')
    let current: any = noteData
    for (const key of pathArray) {
      if (!current || current[key] === undefined) return ''
      current = current[key]
    }
    return current
  }

  const getSelectedEvents = () => {
    const events = noteData.ceremony?.events || {}
    const eventNames: Record<string, string> = {
      blessing: '덕담',
      congratulatorySpeech: '축사',
      congratulatorySong: '축가',
      congratulatoryDance: '축무',
      flowerGirl: '화동',
      ringExchange: '예물교환',
      videoPlay: '영상재생',
      flashCut: '플래시컷',
      bouquetCut: '부케컷',
      flowerShower: '플라워샤워'
    }

    return Object.entries(events)
      .filter(([key, value]) => value === true && eventNames[key])
      .map(([key]) => eventNames[key])
  }

  const eventItems = [
    { key: 'blessing', label: '덕담' },
    { key: 'congratulatorySpeech', label: '축사' },
    { key: 'congratulatorySong', label: '축가' },
    { key: 'congratulatoryDance', label: '축무' },
    { key: 'flowerGirl', label: '화동' },
    { key: 'ringExchange', label: '예물교환' },
    { key: 'videoPlay', label: '영상재생' },
    { key: 'flashCut', label: '플래시컷' },
    { key: 'bouquetCut', label: '부케컷' },
    { key: 'flowerShower', label: '플라워샤워' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full sm:max-w-4xl sm:h-auto sm:max-h-[85vh] sm:overflow-y-auto p-0 sm:p-6 flex flex-col sm:block">
        <DialogHeader className="pb-4 border-b px-4 pt-4 sm:px-0 sm:pt-0 flex-shrink-0 sm:flex-shrink">
          <div className="flex items-center justify-between gap-4">
            {/* 왼쪽: 아이콘 + 타이틀 */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl text-left">
                  {schedule.location} <span className="text-muted-foreground">·</span> {schedule.couple}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {schedule.date} · {schedule.time}
                </p>
              </div>
            </div>

            {/* 오른쪽: 상태 + 토글 */}
            <div className="flex items-center gap-2 flex-shrink-0 relative top-3">
              <span className="text-sm text-muted-foreground">
                {isEditMode ? '편집 중' : '읽기 전용'}
              </span>
              <Switch
                checked={isEditMode}
                onCheckedChange={setIsEditMode}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 px-4 sm:px-0 flex-1 overflow-y-auto sm:flex-auto sm:overflow-visible">
          {/* 중요 메모 */}
          <SectionCard icon={AlertCircle} title="중요 메모" show={isEditMode ? true : !!getValue('importantMemo')} isEditMode={isEditMode}>
            <Textarea
              value={getValue('importantMemo')}
              onChange={(e) => handleArrowReplacement(e, 'importantMemo')}
              onInput={handleTextareaInput}
              onBlur={saveField}
              readOnly={!isEditMode}
              placeholder={isEditMode ? '중요한 사항을 기록하세요' : ''}
              rows={1}
              className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0 overflow-hidden shadow-none text-sm leading-tight' : 'resize-none overflow-hidden text-sm leading-tight'}
            />
          </SectionCard>

          {/* 메인 섹션들 - 2열 그리드 */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* 메이크업샵 */}
            <SectionCard icon={Sparkles} title="메이크업샵" show={isEditMode ? true : hasAnyMakeupData} isEditMode={isEditMode}>
              <Input
                value={getValue('makeupShop.name')}
                onChange={(e) => handleArrowReplacement(e, 'makeupShop.name')}
                onBlur={saveField}
                readOnly={!isEditMode}
                placeholder="샵 이름"
                className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">출발</Label>
                  <Input
                    value={getValue('makeupShop.departureTime')}
                    onChange={(e) => handleArrowReplacement(e, 'makeupShop.departureTime')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="00:00"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">도착</Label>
                  <Input
                    value={getValue('makeupShop.arrivalTime')}
                    onChange={(e) => handleArrowReplacement(e, 'makeupShop.arrivalTime')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="00:00"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 드레스 */}
            <SectionCard icon={Scissors} title="드레스" show={isEditMode ? true : hasAnyDressData} isEditMode={isEditMode}>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={getValue('dress.type')}
                  onChange={(e) => handleArrowReplacement(e, 'dress.type')}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder="종류"
                  className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                />
                <Input
                  value={getValue('dress.material')}
                  onChange={(e) => handleArrowReplacement(e, 'dress.material')}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder="재질/장식"
                  className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                />
              </div>
              <Input
                value={getValue('dress.company')}
                onChange={(e) => handleArrowReplacement(e, 'dress.company')}
                onBlur={saveField}
                readOnly={!isEditMode}
                placeholder="드레스샵"
                className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
              />
            </SectionCard>

            {/* 직계 가족 */}
            <SectionCard icon={Users} title="직계 가족" show={isEditMode ? true : hasAnyFamilyData} isEditMode={isEditMode}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">신랑측</Label>
                  <Input
                    value={getValue('familyRelations.groomFamily')}
                    onChange={(e) => handleArrowReplacement(e, 'familyRelations.groomFamily')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="부, 모, 남동생"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">신부측</Label>
                  <Input
                    value={getValue('familyRelations.brideFamily')}
                    onChange={(e) => handleArrowReplacement(e, 'familyRelations.brideFamily')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="부, 모, 언니"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 서브 작가 */}
            <SectionCard icon={Camera} title="서브 작가" show={isEditMode ? true : hasAnySubPhotographerData} isEditMode={isEditMode}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">영상(DVD)</Label>
                  <Input
                    value={getValue('subPhotographer.videoDvd')}
                    onChange={(e) => handleArrowReplacement(e, 'subPhotographer.videoDvd')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="영상 작가"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">서브/아이폰</Label>
                  <Input
                    value={getValue('subPhotographer.subIphoneSnap')}
                    onChange={(e) => handleArrowReplacement(e, 'subPhotographer.subIphoneSnap')}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder="서브 작가"
                    className={!isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* 사회자 */}
          <SectionCard icon={MessageSquare} title="사회자" show={isEditMode ? true : hasAnyCeremonyHostData} isEditMode={isEditMode}>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={getValue('ceremony.host.type') === 'professional' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      updateFieldLocal('ceremony.host.type', 'professional')
                      saveField()
                    }}
                  >
                    전문가
                  </Button>
                  <Button
                    type="button"
                    variant={getValue('ceremony.host.type') === 'acquaintance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      updateFieldLocal('ceremony.host.type', 'acquaintance')
                      saveField()
                    }}
                  >
                    지인
                  </Button>
                </div>
              ) : (
                getValue('ceremony.host.type') && (
                  <Badge variant="secondary">
                    {getValue('ceremony.host.type') === 'professional' ? '전문가' : '지인'}
                  </Badge>
                )
              )}
            </div>
            <Input
              value={getValue('ceremony.host.memo')}
              onChange={(e) => handleArrowReplacement(e, 'ceremony.host.memo')}
              onBlur={saveField}
              readOnly={!isEditMode}
              placeholder="메모"
              className={cn(
                !isEditMode && !getValue('ceremony.host.memo') && 'hidden',
                !isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'
              )}
            />
          </SectionCard>

          {/* 이벤트 */}
          <SectionCard icon={Sparkles} title="예식 이벤트" show={isEditMode ? true : hasAnyCeremonyEventsData} isEditMode={isEditMode}>
            {!isEditMode && getSelectedEvents().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {getSelectedEvents().map((event) => (
                  <Badge key={event} variant="secondary">
                    {event}
                  </Badge>
                ))}
              </div>
            )}

            {isEditMode && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {eventItems.map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${key}`}
                      checked={getValue(`ceremony.events.${key}`) === true}
                      onCheckedChange={() => {
                        toggleEvent(key)
                        setTimeout(() => saveField(), 0)
                      }}
                    />
                    <Label
                      htmlFor={`event-${key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <Input
              value={getValue('ceremony.events.memo')}
              onChange={(e) => handleArrowReplacement(e, 'ceremony.events.memo')}
              onBlur={saveField}
              readOnly={!isEditMode}
              placeholder="이벤트 메모"
              className={cn(
                !isEditMode && !getValue('ceremony.events.memo') && 'hidden',
                !isEditMode ? 'border-none bg-transparent px-0 h-auto py-1 mt-2 shadow-none focus-visible:ring-0 text-sm' : 'text-sm'
              )}
            />
          </SectionCard>

          {/* 사진 컨셉 & 분위기 */}
          <SectionCard icon={Palette} title="사진 컨셉 & 분위기" show={isEditMode ? true : !!getValue('photoConceptMemo')} isEditMode={isEditMode}>
            <Textarea
              value={getValue('photoConceptMemo')}
              onChange={(e) => handleArrowReplacement(e, 'photoConceptMemo')}
              onInput={handleTextareaInput}
              onBlur={saveField}
              readOnly={!isEditMode}
              placeholder={isEditMode ? '원하시는 사진의 컨셉과 분위기를 자유롭게 작성해주세요' : ''}
              rows={1}
              className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0 overflow-hidden shadow-none text-sm leading-tight' : 'resize-none overflow-hidden text-sm leading-tight'}
            />
          </SectionCard>

          {/* 요청사항 & 질문 */}
          <SectionCard icon={MessageSquare} title="요청사항 & 질문" show={isEditMode ? true : !!getValue('requestsMemo')} isEditMode={isEditMode}>
            <Textarea
              value={getValue('requestsMemo')}
              onChange={(e) => handleArrowReplacement(e, 'requestsMemo')}
              onInput={handleTextareaInput}
              onBlur={saveField}
              readOnly={!isEditMode}
              placeholder={isEditMode ? '궁금한 점이나 특별한 요청사항을 작성해주세요' : ''}
              rows={1}
              className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0 overflow-hidden shadow-none text-sm leading-tight' : 'resize-none overflow-hidden text-sm leading-tight'}
            />
          </SectionCard>

          {/* 빈 상태 */}
          {!hasData && !isEditMode && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">촬영노트가 비어있습니다</h3>
              <p className="text-sm text-muted-foreground mb-4">
                편집 모드를 활성화하여 촬영 관련 정보를 입력해보세요
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
              >
                편집 모드 켜기
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
