import { ContentModal } from '@/components/common/ContentModal'
import { AlertDialog } from '@/components/common/AlertDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import type { Schedule, PhotoSequenceItem } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect } from 'react'
import { Plus, RotateCcw, Lock, Unlock, Mic, MicOff, CassetteTape, X, ChevronLeft, Settings, Sparkles, Clock, Check, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react'
import { generatePhotoSequence, PHOTO_SEQUENCE_TEMPLATES, type TemplateKey } from '../constants/photoSequenceTemplates'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_VOICE_TRAINING, type VoiceTrainingData } from '../types/voiceRecognition'
import { PHOTO_SEQUENCE_STORAGE_KEYS, PHOTO_SEQUENCE_TIMERS, PHOTO_SEQUENCE_DRAG, VOICE_RECOGNITION_THRESHOLD, SCHEDULE_TIMER } from '@/lib/constants/photoSequence'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { SortableItem } from './SortableItem'
import { TrainingDataManager } from './TrainingDataManager'
import { useVoiceTrainingData, useUpdateVoiceTrainingData } from '@/features/auth/hooks/useUsers'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

interface PhotoSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: Schedule
}

export function PhotoSequenceDialog({ open, onOpenChange, schedule }: PhotoSequenceDialogProps) {
  const updateSchedule = useUpdateSchedule()
  const { user } = useAuthStore()

  // 모달이 열릴 때만 서버 데이터 조회
  const { data: serverTrainingData, isLoading: isLoadingTrainingData } = useVoiceTrainingData(
    open && user?.id ? user.id : undefined
  )
  const updateTrainingDataMutation = useUpdateVoiceTrainingData()

  const [items, setItems] = useState<PhotoSequenceItem[]>(() => {
    // currentTemplate을 먼저 확인
    if (schedule.currentTemplate === 'CUSTOM' && schedule.photoSequence) {
      // 사용자 지정 템플릿
      return schedule.photoSequence
    } else if (schedule.currentTemplate && schedule.currentTemplate !== 'CUSTOM') {
      // 템플릿 1,2,3
      const template = PHOTO_SEQUENCE_TEMPLATES[schedule.currentTemplate as TemplateKey]
      return generatePhotoSequence(template.items as Omit<PhotoSequenceItem, 'id'>[])
    }
    // 기본 템플릿
    return generatePhotoSequence()
  })
  const [newItemText, setNewItemText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(() => {
    // currentTemplate을 먼저 확인
    if (schedule.currentTemplate) {
      return schedule.currentTemplate as TemplateKey
    }
    // 기본값
    return 'POSE_FIRST'
  })
  const [isLocked, setIsLocked] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.LOCKED, false)
  const [voiceEnabled, setVoiceEnabled] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_ENABLED, false)
  const [voiceThreshold, setVoiceThreshold] = useLocalStorage<number>(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_THRESHOLD, VOICE_RECOGNITION_THRESHOLD.DEFAULT)
  const [showClock, setShowClock] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.SHOW_CLOCK, true)
  const [handlePosition, setHandlePosition] = useLocalStorage<'left' | 'right'>(PHOTO_SEQUENCE_STORAGE_KEYS.HANDLE_POSITION, 'left')

  // 현재 시간 표시용 state
  const [currentTime, setCurrentTime] = useState('')

  const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null)
  const [collectedPhrases, setCollectedPhrases] = useState<string[]>([])
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null)
  const [showTrainingManager, setShowTrainingManager] = useState(false)
  const [showAccuracySettings, setShowAccuracySettings] = useState(false)
  const [voiceNotSupportedOpen, setVoiceNotSupportedOpen] = useState(false)
  const [showRecognizedText, setShowRecognizedText] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [matchedItemText, setMatchedItemText] = useState('')

  // 서버에서 로드한 데이터 또는 기본값 사용 (항상 서버 데이터 우선)
  const trainingData = serverTrainingData || DEFAULT_VOICE_TRAINING

  // 모달이 열리고 서버 데이터를 로드했을 때 NULL이면 기본값을 DB에 주입
  useEffect(() => {
    if (open && user?.id && !isLoadingTrainingData && serverTrainingData === null) {
      updateTrainingDataMutation.mutate({
        userId: user.id,
        data: DEFAULT_VOICE_TRAINING
      })
    }
  }, [open, user?.id, isLoadingTrainingData, serverTrainingData])

  // 모달이 열릴 때만 초기화
  useEffect(() => {
    if (open) {
      // currentTemplate을 먼저 확인
      if (schedule.currentTemplate === 'CUSTOM' && schedule.photoSequence) {
        // 사용자 지정 템플릿
        setItems(schedule.photoSequence)
        setSelectedTemplate('CUSTOM')
      } else if (schedule.currentTemplate && schedule.currentTemplate !== 'CUSTOM') {
        // 템플릿 1,2,3
        const template = PHOTO_SEQUENCE_TEMPLATES[schedule.currentTemplate as TemplateKey]
        setItems(generatePhotoSequence(template.items as Omit<PhotoSequenceItem, 'id'>[]))
        setSelectedTemplate(schedule.currentTemplate as TemplateKey)
      } else {
        // 기본 템플릿
        setItems(generatePhotoSequence())
        setSelectedTemplate('POSE_FIRST')
      }
    }
  }, [open, schedule.currentTemplate])

  // 활성 항목과 삭제된 항목 분리
  const activeItems = items.filter(item => !item.deleted)
  const deletedItems = items.filter(item => item.deleted)

  // 실시간 저장 (사용자 조작 시)
  const saveToServer = (updatedItems: PhotoSequenceItem[]) => {
    updateSchedule.mutate({
      id: schedule.id,
      photoSequence: updatedItems,
      currentTemplate: 'CUSTOM', // 사용자 조작 시 사용자 지정으로 변경
    })
    // 로컬 상태도 업데이트
    setSelectedTemplate('CUSTOM')
  }

  // 체크 토글 (실시간 저장)
  const toggleComplete = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 항목 추가 (실시간 저장)
  const addItem = () => {
    if (!newItemText.trim()) return

    const newItem: PhotoSequenceItem = {
      id: `seq-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      order: items.length + 1,
      deleted: false,
    }

    setItems(prev => {
      const updated = [...prev, newItem]
      saveToServer(updated)
      return updated
    })
    setNewItemText('')
  }

  // 항목 삭제 (deleted 플래그로 변경)
  const deleteItem = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, deleted: true } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 삭제된 항목 복원 (실시간 저장)
  const restoreItem = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, deleted: false } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 영구 삭제
  const permanentlyDelete = (id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id)
      saveToServer(updated)
      return updated
    })
  }

  // 모두 초기화 (실시간 저장, 활성 항목만)
  const handleReset = () => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.deleted ? item : { ...item, completed: false }
      )
      saveToServer(updated)
      return updated
    })
  }

  // 잠금 토글
  const toggleLock = () => {
    setIsLocked((prev) => !prev)
  }

  // 음성 인식 토글
  const toggleVoice = () => {
    // 켜려고 할 때 브라우저가 지원하지 않으면 경고
    if (!voiceEnabled && !isSupported) {
      setVoiceNotSupportedOpen(true)
      return
    }

    setVoiceEnabled((prev) => !prev)
  }

  // 훈련 모드 시작
  const startTraining = (itemId: string) => {
    // 같은 카드를 다시 롱프레스하면 마킹 해제
    if (trainingTargetId === itemId) {
      setTrainingTargetId(null)
      setCollectedPhrases([])
      setExpandedTrainingId(null)
    } else {
      // 다른 카드로 마킹 이동
      setTrainingTargetId(itemId)
      setCollectedPhrases([])
      setExpandedTrainingId(null)
    }
  }

  // 훈련 모드 종료
  const endTraining = () => {
    if (trainingTargetId && collectedPhrases.length > 0) {
      setExpandedTrainingId(trainingTargetId)
    }
    setTrainingTargetId(null)
  }

  // 훈련 데이터 저장 (서버에만 저장, React Query가 자동 업데이트)
  const saveTrainingData = (itemText: string, selectedPhrases: string[]) => {
    const updatedData = {
      ...trainingData,
      [itemText]: selectedPhrases,
    }

    // 서버에 저장 (로그인한 사용자만)
    if (user?.id) {
      updateTrainingDataMutation.mutate({
        userId: user.id,
        data: updatedData
      })
    }

    setExpandedTrainingId(null)
    setCollectedPhrases([])
  }

  // TrainingDataManager에서 저장 시 호출되는 함수
  const handleSaveTrainingManager = (data: VoiceTrainingData) => {
    // 서버에 저장만 (로그인한 사용자만)
    if (user?.id) {
      updateTrainingDataMutation.mutate({
        userId: user.id,
        data
      })
    }
  }

  // 음성 인식 매칭 콜백
  const handleVoiceMatch = (itemText: string) => {
    // 훈련 모드가 아닐 때만 자동 체크
    if (!trainingTargetId) {
      const matchedItem = items.find(item => !item.deleted && item.text === itemText)
      if (matchedItem && !matchedItem.completed) {
        toggleComplete(matchedItem.id)
        // 매칭된 카드 제목 저장
        setMatchedItemText(matchedItem.text)
      }
    }
  }

  // 음성 인식 데이터 수집 콜백 (훈련 모드)
  const handleVoiceCollect = (phrase: string) => {
    if (trainingTargetId) {
      setCollectedPhrases(prev => [...prev, phrase])
    }
  }

  // 음성 인식 훅 사용 (모달이 열려있을 때만)
  const { isListening, lastRecognized, isSupported } = useVoiceRecognition({
    enabled: open && voiceEnabled,
    trainingData,
    itemTexts: activeItems.map(item => item.text),
    onMatch: handleVoiceMatch,
    onCollect: handleVoiceCollect,
    threshold: voiceThreshold,
  })

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    if (!showClock) return

    const updateTime = () => {
      const now = new Date()
      let hours = now.getHours()
      hours = hours % 12
      hours = hours ? hours : 12 // 0시는 12시로 표시
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}:${seconds}`)
    }

    updateTime() // 즉시 표시
    const interval = setInterval(updateTime, 1000) // 1초마다 업데이트

    return () => clearInterval(interval)
  }, [showClock])

  // 모달이 닫히면 음성 인식 강제 종료 및 오버레이 즉시 제거
  useEffect(() => {
    if (!open) {
      if (voiceEnabled) {
        setVoiceEnabled(false)
      }
      // 오버레이 즉시 제거
      setDisplayedText('')
      setShowRecognizedText(false)
      setMatchedItemText('')
    }
  }, [open])

  // 음성 끄면 훈련 종료 및 오버레이 즉시 제거
  useEffect(() => {
    if (!voiceEnabled) {
      if (trainingTargetId) {
        endTraining()
      }
      // 오버레이 즉시 제거
      setDisplayedText('')
      setShowRecognizedText(false)
      setMatchedItemText('')
    }
  }, [voiceEnabled])

  // 음성 인식 켜지면 힌트 표시
  useEffect(() => {
    if (voiceEnabled) {
      setDisplayedText('카드를 길게 누르면 훈련 모드로 진입합니다.')
      setShowRecognizedText(true)

      const timer = setTimeout(() => {
        setShowRecognizedText(false)
      }, PHOTO_SEQUENCE_TIMERS.FADE_OUT)

      return () => clearTimeout(timer)
    }
  }, [voiceEnabled])

  // 인식된 텍스트 표시 및 자동 페이드 아웃
  useEffect(() => {
    if (lastRecognized) {
      setDisplayedText(lastRecognized)
      setShowRecognizedText(true)

      const timer = setTimeout(() => {
        setShowRecognizedText(false)
        setMatchedItemText('') // 페이드 아웃 후 초기화
      }, PHOTO_SEQUENCE_TIMERS.FADE_OUT)

      return () => clearTimeout(timer)
    }
  }, [lastRecognized])

  // 매칭된 카드 제목 표시 (즉시)
  useEffect(() => {
    if (matchedItemText) {
      setDisplayedText(`✓ ${matchedItemText}`)
      setShowRecognizedText(true)
    }
  }, [matchedItemText])

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: PHOTO_SEQUENCE_DRAG.ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(item => item.id === active.id)
        const newIndex = prev.findIndex(item => item.id === over.id)

        const newItems = arrayMove(prev, oldIndex, newIndex)

        // order 재계산
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index + 1
        }))

        saveToServer(updatedItems)
        return updatedItems
      })
    }
  }

  // 템플릿 변경 핸들러
  const handleTemplateChange = (templateKey: TemplateKey) => {
    // CUSTOM 선택 시: DB에 저장된 사용자 지정 데이터 불러오기
    if (templateKey === 'CUSTOM') {
      if (schedule.photoSequence) {
        setItems(schedule.photoSequence)
        setSelectedTemplate('CUSTOM')
        // current_template을 CUSTOM으로 업데이트
        updateSchedule.mutate({
          id: schedule.id,
          currentTemplate: 'CUSTOM',
        })
      }
      return
    }

    // 템플릿 1,2,3 선택 시: 미리 정의된 템플릿 적용
    setSelectedTemplate(templateKey)
    const template = PHOTO_SEQUENCE_TEMPLATES[templateKey]
    const newItems = generatePhotoSequence(template.items)
    setItems(newItems)

    // current_template만 업데이트 (photoSequence는 건드리지 않음)
    updateSchedule.mutate({
      id: schedule.id,
      currentTemplate: templateKey,
    })
  }

  return (
    <>
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="md:max-w-2xl md:min-w-[500px] md:h-[90dvh]"
      showHeader={!isLocked}
      animateHeader={true}
      headerContent={
        <div className="flex items-center gap-3 w-full">
          {/* 뒤로가기 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* 템플릿 선택 (잠금 모드가 아닐 때만) */}
          {!isLocked ? (
            <div className="flex-1 min-w-0">
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHOTO_SEQUENCE_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex-1 min-w-0"></div>
          )}

          {/* 오른쪽 액션 버튼들 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isListening && (
              <span className="text-sm text-muted-foreground">듣는 중</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`h-9 w-9 ${voiceEnabled ? 'text-red-500' : ''} ${isListening ? 'animate-pulse' : ''}`}
              title={voiceEnabled ? "음성 인식 끄기" : "음성 인식 켜기"}
            >
              {voiceEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  title="설정"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowClock(!showClock)} className="cursor-pointer">
                  {showClock ? <Check className="h-4 w-4 mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  현재시간 표시
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHandlePosition(prev => prev === 'left' ? 'right' : 'left')} className="cursor-pointer">
                  {handlePosition === 'left' ? <ArrowRightToLine className="h-4 w-4 mr-2" /> : <ArrowLeftToLine className="h-4 w-4 mr-2" />}
                  카드핸들 좌우 전환
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTrainingManager(true)} className="cursor-pointer">
                  <CassetteTape className="h-4 w-4 mr-2" />
                  음성인식 훈련 데이터
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAccuracySettings(true)} className="cursor-pointer">
                  <Sparkles className="h-4 w-4 mr-2" />
                  음성인식 정확도 설정
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-9 w-9"
              title="모두 초기화"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLock}
              className={`h-9 w-9 ${isLocked ? 'text-destructive hover:text-destructive' : 'opacity-50'}`}
              title={isLocked ? "잠금 해제" : "잠금"}
            >
              {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      }
      showFooter={!isLocked}
      footerContent={
        <div className="flex gap-2 w-full">
          <Input
            placeholder="항목 추가..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
            className="flex-1"
          />
          <Button onClick={addItem} size="icon" variant="outline" className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      }
    >
        {/* 락 걸렸을 때 우측 상단 플로팅 버튼들 */}
        {isLocked && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`h-9 w-9 ${voiceEnabled ? 'text-red-500' : ''} ${isListening ? 'animate-pulse' : ''}`}
              title={voiceEnabled ? "음성 인식 끄기" : "음성 인식 켜기"}
            >
              {voiceEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLock}
              className="text-destructive"
              title="잠금 해제"
            >
              <Lock className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* 락 모드에 따른 레이아웃 분기 */}
        {isLocked ? (
          // 락 모드: 상단 컨테이너 + 좌우 분할 레이아웃
          <div className="flex flex-col h-full gap-6">
            {/* 상단 컨테이너 (전체 폭, 확장 가능) - 음성 인식 텍스트 표시 */}
            <div className={`flex items-center justify-center transition-all duration-300 ${voiceEnabled ? 'min-h-[60px]' : 'min-h-[24px]'}`}>
              {displayedText && (
                <div className={`transition-all duration-500 ${showRecognizedText ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <div
                    className={`text-lg font-medium text-center ${matchedItemText ? 'text-primary' : 'text-muted-foreground'}`}
                    style={{ fontFamily: "'Gowun Batang', serif" }}
                  >
                    {displayedText}
                  </div>
                </div>
              )}
            </div>

            {/* 좌우 분할 레이아웃 */}
            <div className="flex gap-4 flex-1">
              {/* 왼쪽: 카드 리스트 */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {activeItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    촬영 순서를 추가해주세요
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {activeItems.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            isLocked={isLocked}
                            voiceEnabled={voiceEnabled}
                            handlePosition={handlePosition}
                            onToggleComplete={toggleComplete}
                            onDelete={deleteItem}
                            trainingTargetId={trainingTargetId}
                            collectedCount={trainingTargetId === item.id ? collectedPhrases.length : 0}
                            isExpanded={expandedTrainingId === item.id}
                            collectedPhrases={expandedTrainingId === item.id ? collectedPhrases : []}
                            onStartTraining={startTraining}
                            onSaveTraining={saveTrainingData}
                            onCancelTraining={() => {
                              setExpandedTrainingId(null)
                              setCollectedPhrases([])
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* 오른쪽: 정보 패널 (시계) */}
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* 시계 표시 */}
                {showClock && currentTime && (
                  <div className="text-center">
                    <div
                      className="text-6xl tracking-wider"
                      style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 300 }}
                    >
                      {currentTime}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 일반 모드: 기존 레이아웃
          <>
            {/* 화면 중앙 플로팅 오버레이 - 인식된 텍스트 (일반 모드만) */}
            {displayedText && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <div className={`bg-background/80 backdrop-blur-md border rounded-full px-6 py-4 max-w-md mx-4 transition-all duration-500 ${showRecognizedText ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <div
                    className={`text-lg font-medium text-center ${matchedItemText ? 'text-primary' : 'text-muted-foreground'}`}
                    style={{ fontFamily: "'Gowun Batang', serif" }}
                  >
                    {displayedText}
                  </div>
                </div>
              </div>
            )}

            {activeItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                촬영 순서를 추가해주세요
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {activeItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        isLocked={isLocked}
                        voiceEnabled={voiceEnabled}
                        handlePosition={handlePosition}
                        onToggleComplete={toggleComplete}
                        onDelete={deleteItem}
                        trainingTargetId={trainingTargetId}
                        collectedCount={trainingTargetId === item.id ? collectedPhrases.length : 0}
                        isExpanded={expandedTrainingId === item.id}
                        collectedPhrases={expandedTrainingId === item.id ? collectedPhrases : []}
                        onStartTraining={startTraining}
                        onSaveTraining={saveTrainingData}
                        onCancelTraining={() => {
                          setExpandedTrainingId(null)
                          setCollectedPhrases([])
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 삭제된 항목 배지 */}
            {deletedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-[15px] pr-[5px] pb-[10px] pl-[5px]">
                {deletedItems.map((item) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent flex items-center gap-1.5 px-3 py-1.5 font-normal"
                  >
                    <span onClick={() => restoreItem(item.id)}>{item.text}</span>
                    <X
                      className="h-3 w-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        permanentlyDelete(item.id)
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
    </ContentModal>

      {/* 훈련 데이터 관리 다이얼로그 */}
      <TrainingDataManager
        open={showTrainingManager}
        onOpenChange={setShowTrainingManager}
        trainingData={trainingData}
        onSave={handleSaveTrainingManager}
        items={activeItems}
      />

      {/* 브라우저 미지원 알림 */}
      <AlertDialog
        open={voiceNotSupportedOpen}
        onOpenChange={setVoiceNotSupportedOpen}
        title="음성 인식 지원 안 됨"
        description="현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari 등의 브라우저를 사용해주세요."
      />

      {/* 음성인식 정확도 설정 다이얼로그 */}
      <ContentModal
        open={showAccuracySettings}
        onOpenChange={setShowAccuracySettings}
        size="md"
        title="음성인식 정확도 설정"
        showFooter={true}
        footerContent={
          <div className="flex justify-end w-full">
            <Button onClick={() => setShowAccuracySettings(false)}>
              확인
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* 설명 */}
          <div className="space-y-2">
            <h3 className="font-medium">휴리스틱 알고리즘이란?</h3>
            <p className="text-sm text-muted-foreground">
              음성 인식 시 입력된 음성과 등록된 키워드를 비교하여 얼마나 유사한지 판단하는 알고리즘입니다.
              정확도가 높을수록 완벽하게 일치해야 인식되고, 낮을수록 비슷한 발음도 인식됩니다.
            </p>
          </div>

          {/* 슬라이더 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">매칭 정확도</label>
              <span className="text-2xl font-bold tabular-nums">{voiceThreshold}%</span>
            </div>
            <Slider
              value={[voiceThreshold]}
              onValueChange={(value) => setVoiceThreshold(value[0])}
              min={VOICE_RECOGNITION_THRESHOLD.MIN}
              max={VOICE_RECOGNITION_THRESHOLD.MAX}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>관대함 ({VOICE_RECOGNITION_THRESHOLD.MIN}%)</span>
              <span>엄격함 ({VOICE_RECOGNITION_THRESHOLD.MAX}%)</span>
            </div>
          </div>

          {/* 가이드 */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>권장:</strong> 75-85% 정도가 적당합니다. 너무 낮으면 잘못된 인식이 많아지고, 너무 높으면 정확히 말해야만 인식됩니다.
            </p>
          </div>
        </div>
      </ContentModal>
    </>
  )
}
