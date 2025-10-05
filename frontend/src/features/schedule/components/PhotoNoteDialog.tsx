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
import { useUpdateSchedule } from '../hooks/useSchedules'
import type { Schedule, PhotoNote } from '../types/schedule'
import { AlertCircle } from 'lucide-react'

interface PhotoNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: Schedule
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
      type: 'professional',
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

  // Deep merge로 기본값과 기존 데이터 병합
  const initialData = useMemo(
    () => deepMerge(defaultPhotoNote, schedule.photoNote),
    [schedule.photoNote]
  )

  const [isEditMode, setIsEditMode] = useState(false)
  const [noteData, setNoteData] = useState<PhotoNote>(initialData)

  // schedule이 변경되면 noteData 업데이트
  useEffect(() => {
    const merged = deepMerge(defaultPhotoNote, schedule.photoNote)
    setNoteData(merged)
  }, [schedule.photoNote])

  // 데이터 존재 여부 확인
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

  // 섹션별 데이터 존재 여부
  const hasAnyMakeupData = !!(noteData.makeupShop?.name || noteData.makeupShop?.departureTime || noteData.makeupShop?.arrivalTime)
  const hasAnyDressData = !!(noteData.dress?.type || noteData.dress?.material || noteData.dress?.company)
  const hasAnyFamilyData = !!(noteData.familyRelations?.groomFamily || noteData.familyRelations?.brideFamily)
  const hasAnyCeremonyHostData = !!(noteData.ceremony?.host?.type || noteData.ceremony?.host?.memo)
  const hasAnyCeremonyEventsData = !!(
    noteData.ceremony?.events?.memo ||
    Object.entries(noteData.ceremony?.events || {}).some(([key, value]) => key !== 'memo' && value === true)
  )
  const hasAnySubPhotographerData = !!(noteData.subPhotographer?.videoDvd || noteData.subPhotographer?.subIphoneSnap)

  // 초기 모드 설정 (다이얼로그 열릴 때만)
  useEffect(() => {
    if (open) {
      setIsEditMode(!hasData)
    }
  }, [open]) // hasData 의존성 제거 - 타이핑 중 모드 전환 방지

  // 필드 업데이트 (로컬만)
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

  // 필드 저장 (로컬 + 서버)
  const saveField = () => {
    console.log('💾 Saving photoNote:', noteData)
    updateSchedule.mutate({
      id: schedule.id,
      photoNote: noteData
    })
  }

  // 체크박스 토글
  const toggleEvent = (eventKey: string) => {
    const current = (noteData.ceremony?.events as any)?.[eventKey]
    updateFieldLocal(`ceremony.events.${eventKey}`, !current)
  }

  // path로 값 가져오기
  const getValue = (path: string): any => {
    const pathArray = path.split('.')
    let current: any = noteData
    for (const key of pathArray) {
      if (!current || current[key] === undefined) return ''
      current = current[key]
    }
    return current
  }

  // 선택된 이벤트 목록 (readonly 모드용)
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
      .join(', ')
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>촬영노트</DialogTitle>
            <div className="flex items-center gap-2 mr-5">
              <Label htmlFor="edit-mode" className="text-sm text-muted-foreground cursor-pointer">
                편집모드
              </Label>
              <Switch
                id="edit-mode"
                checked={isEditMode}
                onCheckedChange={setIsEditMode}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 중요 메모 */}
          {(isEditMode || getValue('importantMemo')) && (
            <div className="space-y-2">
              <Label htmlFor="important-memo" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>중요 메모</Label>
              <Textarea
                id="important-memo"
                value={getValue('importantMemo')}
                onChange={(e) => updateFieldLocal('importantMemo', e.target.value)}
                onBlur={saveField}
                readOnly={!isEditMode}
                placeholder={isEditMode ? '중요 메모 입력' : ''}
                rows={2}
                className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0' : ''}
              />
            </div>
          )}

          {/* 메이크업샵 */}
          {(isEditMode || hasAnyMakeupData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>메이크업샵</h3>

              {(isEditMode || getValue('makeupShop.name')) && (
                <Input
                  id="makeup-name"
                  value={getValue('makeupShop.name')}
                  onChange={(e) => updateFieldLocal('makeupShop.name', e.target.value)}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder={isEditMode ? '메이크업샵 이름' : ''}
                  className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                />
              )}

              {(isEditMode || getValue('makeupShop.departureTime') || getValue('makeupShop.arrivalTime')) && (
                <div className="grid grid-cols-2 gap-3">
                  {(isEditMode || getValue('makeupShop.departureTime')) && (
                    <div className="space-y-2">
                      <Label htmlFor="makeup-departure" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>출발 시간</Label>
                      <Input
                        id="makeup-departure"
                        value={getValue('makeupShop.departureTime')}
                        onChange={(e) => updateFieldLocal('makeupShop.departureTime', e.target.value)}
                        onBlur={saveField}
                        readOnly={!isEditMode}
                        placeholder={isEditMode ? 'HH:MM' : ''}
                        className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                      />
                    </div>
                  )}

                  {(isEditMode || getValue('makeupShop.arrivalTime')) && (
                    <div className="space-y-2">
                      <Label htmlFor="makeup-arrival" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>도착 시간</Label>
                      <Input
                        id="makeup-arrival"
                        value={getValue('makeupShop.arrivalTime')}
                        onChange={(e) => updateFieldLocal('makeupShop.arrivalTime', e.target.value)}
                        onBlur={saveField}
                        readOnly={!isEditMode}
                        placeholder={isEditMode ? 'HH:MM' : ''}
                        className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 드레스 */}
          {(isEditMode || hasAnyDressData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>드레스</h3>
              <div className="grid grid-cols-2 gap-3">
                {(isEditMode || getValue('dress.type')) && (
                  <Input
                    id="dress-type"
                    value={getValue('dress.type')}
                    onChange={(e) => updateFieldLocal('dress.type', e.target.value)}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder={isEditMode ? '드레스 종류' : ''}
                    className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                  />
                )}

                {(isEditMode || getValue('dress.material')) && (
                  <Input
                    id="dress-material"
                    value={getValue('dress.material')}
                    onChange={(e) => updateFieldLocal('dress.material', e.target.value)}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder={isEditMode ? '재질 / 장식' : ''}
                    className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                  />
                )}
              </div>

              {(isEditMode || getValue('dress.company')) && (
                <Input
                  id="dress-company"
                  value={getValue('dress.company')}
                  onChange={(e) => updateFieldLocal('dress.company', e.target.value)}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder={isEditMode ? '드레스샵 이름' : ''}
                  className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                />
              )}
            </div>
          )}

          {/* 가족관계 */}
          {(isEditMode || hasAnyFamilyData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>직계 가족</h3>
              <div className="grid grid-cols-2 gap-3">
                {(isEditMode || getValue('familyRelations.groomFamily')) && (
                  <Input
                    id="groom-family"
                    value={getValue('familyRelations.groomFamily')}
                    onChange={(e) => updateFieldLocal('familyRelations.groomFamily', e.target.value)}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder={isEditMode ? '신랑 (예: 부, 모, 남동생)' : ''}
                    className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                  />
                )}

                {(isEditMode || getValue('familyRelations.brideFamily')) && (
                  <Input
                    id="bride-family"
                    value={getValue('familyRelations.brideFamily')}
                    onChange={(e) => updateFieldLocal('familyRelations.brideFamily', e.target.value)}
                    onBlur={saveField}
                    readOnly={!isEditMode}
                    placeholder={isEditMode ? '신부 (예: 부, 모, 언니)' : ''}
                    className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                  />
                )}
              </div>
            </div>
          )}

          {/* 사회자 */}
          {(isEditMode || hasAnyCeremonyHostData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>사회자</h3>

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
                  <div className="text-sm">
                    {getValue('ceremony.host.type') === 'professional' ? '전문가' : '지인'}
                  </div>
                )
              )}

              {(isEditMode || getValue('ceremony.host.memo')) && (
                <Input
                  id="host-memo"
                  value={getValue('ceremony.host.memo')}
                  onChange={(e) => updateFieldLocal('ceremony.host.memo', e.target.value)}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder={isEditMode ? '사회자 관련 메모' : ''}
                  className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                />
              )}
            </div>
          )}

          {/* 이벤트 */}
          {(isEditMode || hasAnyCeremonyEventsData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>이벤트</h3>

              {!isEditMode && getSelectedEvents() && (
                <div className="text-sm">{getSelectedEvents()}</div>
              )}

              {isEditMode && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {eventItems.map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`event-${key}`}
                        checked={getValue(`ceremony.events.${key}`) === true}
                        onCheckedChange={() => {
                          toggleEvent(key)
                          // Checkbox 토글 후 즉시 저장
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

              {(isEditMode || getValue('ceremony.events.memo')) && (
                <Input
                  id="events-memo"
                  value={getValue('ceremony.events.memo')}
                  onChange={(e) => updateFieldLocal('ceremony.events.memo', e.target.value)}
                  onBlur={saveField}
                  readOnly={!isEditMode}
                  placeholder={isEditMode ? '이벤트 관련 메모' : ''}
                  className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                />
              )}
            </div>
          )}

          {/* 서브작가 */}
          {(isEditMode || hasAnySubPhotographerData) && (
            <div className="space-y-3">
              <h3 className={`text-sm font-semibold ${!isEditMode ? 'text-muted-foreground text-xs' : ''}`}>서브 작가</h3>
              <div className="grid grid-cols-2 gap-3">
                {(isEditMode || getValue('subPhotographer.videoDvd')) && (
                  <div className="space-y-2">
                    <Label htmlFor="video-dvd" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>영상(DVD)</Label>
                    <Input
                      id="video-dvd"
                      value={getValue('subPhotographer.videoDvd')}
                      onChange={(e) => updateFieldLocal('subPhotographer.videoDvd', e.target.value)}
                      onBlur={saveField}
                      readOnly={!isEditMode}
                      placeholder={isEditMode ? '영상 작가' : ''}
                      className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                    />
                  </div>
                )}

                {(isEditMode || getValue('subPhotographer.subIphoneSnap')) && (
                  <div className="space-y-2">
                    <Label htmlFor="sub-iphone" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>서브 / 아이폰 스냅</Label>
                    <Input
                      id="sub-iphone"
                      value={getValue('subPhotographer.subIphoneSnap')}
                      onChange={(e) => updateFieldLocal('subPhotographer.subIphoneSnap', e.target.value)}
                      onBlur={saveField}
                      readOnly={!isEditMode}
                      placeholder={isEditMode ? '서브 작가' : ''}
                      className={!isEditMode ? 'border-none bg-transparent px-0 focus-visible:ring-0' : ''}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 원하시는 사진 컨셉 & 분위기 */}
          {(isEditMode || getValue('photoConceptMemo')) && (
            <div className="space-y-2">
              <Label htmlFor="photo-concept" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>원하시는 사진 컨셉 & 분위기</Label>
              <Textarea
                id="photo-concept"
                value={getValue('photoConceptMemo')}
                onChange={(e) => updateFieldLocal('photoConceptMemo', e.target.value)}
                onBlur={saveField}
                readOnly={!isEditMode}
                placeholder={isEditMode ? '원하시는 사진 컨셉 & 분위기 입력' : ''}
                rows={2}
                className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0' : ''}
              />
            </div>
          )}

          {/* 요청사항 & 질문 */}
          {(isEditMode || getValue('requestsMemo')) && (
            <div className="space-y-2">
              <Label htmlFor="requests" className={!isEditMode ? 'text-muted-foreground text-xs' : ''}>요청사항 & 질문</Label>
              <Textarea
                id="requests"
                value={getValue('requestsMemo')}
                onChange={(e) => updateFieldLocal('requestsMemo', e.target.value)}
                onBlur={saveField}
                readOnly={!isEditMode}
                placeholder={isEditMode ? '요청사항 & 질문 입력' : ''}
                rows={2}
                className={!isEditMode ? 'resize-none border-none bg-transparent px-0 focus-visible:ring-0' : ''}
              />
            </div>
          )}

          {/* 빈 상태 안내 */}
          {!hasData && !isEditMode && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/20 p-4 text-sm">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  촬영노트가 비어있습니다
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  편집모드를 켜서 촬영 관련 정보를 입력해보세요
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
