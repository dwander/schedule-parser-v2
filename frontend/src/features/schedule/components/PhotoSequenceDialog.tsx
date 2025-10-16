import { ContentModal } from '@/components/common/ContentModal'
import { AlertDialog } from '@/components/common/AlertDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import type { Schedule, PhotoSequenceItem } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect } from 'react'
import { Plus, RotateCcw, Lock, Unlock, Mic, MicOff, CassetteTape, X, ChevronLeft, Settings, Sparkles, Clock, ArrowLeftToLine, ArrowRightToLine, Check } from 'lucide-react'
import { generatePhotoSequence, PHOTO_SEQUENCE_TEMPLATES, type TemplateKey } from '../constants/photoSequenceTemplates'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_VOICE_TRAINING, type VoiceTrainingData } from '../types/voiceRecognition'
import { PHOTO_SEQUENCE_STORAGE_KEYS, PHOTO_SEQUENCE_TIMERS, PHOTO_SEQUENCE_DRAG, VOICE_RECOGNITION_THRESHOLD } from '@/lib/constants/photoSequence'
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

/**
 * TemplateKey 타입 가드
 */
function isTemplateKey(key: string | undefined): key is TemplateKey {
  return key !== undefined && key in PHOTO_SEQUENCE_TEMPLATES
}

/**
 * 카드 리스트 렌더링 컴포넌트
 * 락 모드와 일반 모드에서 공통으로 사용
 */
interface CardListContentProps {
  activeItems: PhotoSequenceItem[]
  sensors: ReturnType<typeof useSensors>
  isLocked: boolean
  voiceEnabled: boolean
  handlePosition: 'left' | 'right'
  trainingTargetId: string | null
  collectedPhrasesLength: number
  expandedTrainingId: string | null
  collectedPhrases: string[]
  onDragEnd: (event: DragEndEvent) => void
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onStartTraining: (id: string) => void
  onSaveTraining: (itemText: string, phrases: string[]) => void
  onCancelTraining: () => void
}

function CardListContent({
  activeItems,
  sensors,
  isLocked,
  voiceEnabled,
  handlePosition,
  trainingTargetId,
  collectedPhrasesLength,
  expandedTrainingId,
  collectedPhrases,
  onDragEnd,
  onToggleComplete,
  onDelete,
  onStartTraining,
  onSaveTraining,
  onCancelTraining,
}: CardListContentProps) {
  if (activeItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        촬영 순서를 추가해주세요
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
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
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              trainingTargetId={trainingTargetId}
              collectedCount={trainingTargetId === item.id ? collectedPhrasesLength : 0}
              isExpanded={expandedTrainingId === item.id}
              collectedPhrases={expandedTrainingId === item.id ? collectedPhrases : []}
              onStartTraining={onStartTraining}
              onSaveTraining={onSaveTraining}
              onCancelTraining={onCancelTraining}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
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
    } else if (isTemplateKey(schedule.currentTemplate)) {
      // 템플릿 1,2,3
      const template = PHOTO_SEQUENCE_TEMPLATES[schedule.currentTemplate]
      return generatePhotoSequence(template.items)
    }
    // 기본 템플릿
    return generatePhotoSequence()
  })
  const [newItemText, setNewItemText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(() => {
    // currentTemplate을 먼저 확인
    if (isTemplateKey(schedule.currentTemplate)) {
      return schedule.currentTemplate
    }
    // 기본값
    return 'POSE_FIRST'
  })
  const [isLocked, setIsLocked] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.LOCKED, false)
  const [voiceEnabled, setVoiceEnabled] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_ENABLED, false)
  const [voiceThreshold, setVoiceThreshold] = useLocalStorage<number>(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_THRESHOLD, VOICE_RECOGNITION_THRESHOLD.DEFAULT)
  const [handlePosition, setHandlePosition] = useLocalStorage<'left' | 'right'>(PHOTO_SEQUENCE_STORAGE_KEYS.HANDLE_POSITION, 'left')

  // 촬영 예상 시간 (로컬 state로 관리)
  const [shootingDuration, setShootingDuration] = useState(schedule.shootTimeDuration ?? 60)

  // 모달이 열릴 때 schedule.shootTimeDuration 다시 로드
  useEffect(() => {
    if (open) {
      setShootingDuration(schedule.shootTimeDuration ?? 60)
    }
  }, [open, schedule.shootTimeDuration])

  // 촬영 예상 시간 변경 핸들러
  const handleShootingDurationChange = (duration: number) => {
    setShootingDuration(duration) // 즉시 UI 업데이트
    updateSchedule.mutate({
      id: schedule.id,
      shootTimeDuration: duration,
    })
  }

  // 모달 상태 통합
  const [modalStates, setModalStates] = useState({
    showTrainingManager: false,
    showAccuracySettings: false,
    voiceNotSupportedOpen: false,
    showImportantMemo: false,
  })

  // 음성 인식 UI 상태 통합
  const [voiceUIState, setVoiceUIState] = useState({
    showRecognizedText: false,
    displayedText: '',
    matchedItemText: '',
  })

  // 훈련 모드 상태 통합
  const [trainingState, setTrainingState] = useState({
    targetId: null as string | null,
    collectedPhrases: [] as string[],
    expandedId: null as string | null,
  })

  // 시계 상태 통합
  const [clockState, setClockState] = useState({
    currentTime: '',
    currentSeconds: 0,
    endTime: '',
    remainingTime: '',
  })

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
      } else if (isTemplateKey(schedule.currentTemplate)) {
        // 템플릿 1,2,3
        const template = PHOTO_SEQUENCE_TEMPLATES[schedule.currentTemplate]
        setItems(generatePhotoSequence(template.items))
        setSelectedTemplate(schedule.currentTemplate)
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
      setModalStates(prev => ({
        ...prev,
        voiceNotSupportedOpen: true,
      }))
      return
    }

    setVoiceEnabled((prev) => !prev)
  }

  // 훈련 모드 시작
  const startTraining = (itemId: string) => {
    // 같은 카드를 다시 롱프레스하면 마킹 해제
    if (trainingState.targetId === itemId) {
      setTrainingState({
        targetId: null,
        collectedPhrases: [],
        expandedId: null,
      })
    } else {
      // 다른 카드로 마킹 이동
      setTrainingState({
        targetId: itemId,
        collectedPhrases: [],
        expandedId: null,
      })
    }
  }

  // 훈련 모드 종료
  const endTraining = () => {
    if (trainingState.targetId && trainingState.collectedPhrases.length > 0) {
      setTrainingState(prev => ({
        ...prev,
        expandedId: prev.targetId,
        targetId: null,
      }))
    } else {
      setTrainingState(prev => ({
        ...prev,
        targetId: null,
      }))
    }
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

    setTrainingState(prev => ({
      ...prev,
      expandedId: null,
      collectedPhrases: [],
    }))
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
    if (!trainingState.targetId) {
      const matchedItem = items.find(item => !item.deleted && item.text === itemText)
      if (matchedItem && !matchedItem.completed) {
        toggleComplete(matchedItem.id)
        // 매칭된 카드 제목 저장
        setVoiceUIState(prev => ({
          ...prev,
          matchedItemText: matchedItem.text,
        }))
      }
    }
  }

  // 음성 인식 데이터 수집 콜백 (훈련 모드)
  const handleVoiceCollect = (phrase: string) => {
    if (trainingState.targetId) {
      setTrainingState(prev => ({
        ...prev,
        collectedPhrases: [...prev.collectedPhrases, phrase],
      }))
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

  // 종료 시간 계산 (스케줄 시간 + (촬영시간 - 15분))
  const calculateEndTime = () => {
    try {
      // schedule.date: "YYYY.MM.DD", schedule.time: "HH:MM"
      const [year, month, day] = schedule.date.split('.').map(Number)
      const [hour, minute] = schedule.time.split(':').map(Number)

      const startTime = new Date(year, month - 1, day, hour, minute)
      const actualDuration = shootingDuration - 15 // 촬영 예상 시간에서 15분 빼기
      const endDateTime = new Date(startTime.getTime() + actualDuration * 60 * 1000)

      return endDateTime
    } catch (error) {
      return null
    }
  }

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    const endDateTime = calculateEndTime()

    const updateTime = () => {
      const now = new Date()

      // 현재 시간 (12시간 형식)
      let hours = now.getHours()
      hours = hours % 12
      hours = hours ? hours : 12 // 0시는 12시로 표시
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = now.getSeconds()
      const currentTime = `${hours}:${minutes}`
      const currentSeconds = seconds

      // 종료 시간 및 남은 시간 계산
      let endTime = ''
      let remainingTime = ''
      if (endDateTime) {
        // 종료 시간 (24시간 형식)
        const endHours = String(endDateTime.getHours()).padStart(2, '0')
        const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0')
        endTime = `${endHours}:${endMinutes}`

        // 남은 시간
        const remainingMs = endDateTime.getTime() - now.getTime()
        if (remainingMs > 0) {
          const totalMinutes = Math.ceil(remainingMs / 60000) // 올림 처리
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60

          if (totalMinutes < 60) {
            // 60분 미만: 분만 표시
            remainingTime = `${minutes}분`
          } else {
            // 60분 이상: 시간:분 형식
            remainingTime = `${hours}:${String(minutes).padStart(2, '0')}`
          }
        } else {
          remainingTime = '0분'
        }
      }

      setClockState({ currentTime, currentSeconds, endTime, remainingTime })
    }

    updateTime() // 즉시 표시
    const interval = setInterval(updateTime, 1000) // 1초마다 업데이트

    return () => clearInterval(interval)
  }, [schedule.date, schedule.time, shootingDuration])

  // 모달이 닫히면 음성 인식 강제 종료 및 오버레이 즉시 제거
  useEffect(() => {
    if (!open) {
      if (voiceEnabled) {
        setVoiceEnabled(false)
      }
      // 오버레이 즉시 제거
      setVoiceUIState({
        showRecognizedText: false,
        displayedText: '',
        matchedItemText: '',
      })
    }
  }, [open])

  // 음성 끄면 훈련 종료 및 오버레이 즉시 제거
  useEffect(() => {
    if (!voiceEnabled) {
      if (trainingState.targetId) {
        endTraining()
      }
      // 오버레이 즉시 제거
      setVoiceUIState({
        showRecognizedText: false,
        displayedText: '',
        matchedItemText: '',
      })
    }
  }, [voiceEnabled])

  // 음성 인식 켜지면 힌트 표시
  useEffect(() => {
    if (voiceEnabled) {
      // 락 상태에 따라 다른 메시지 표시
      const message = isLocked ? '듣는 중' : '카드를 길게 누르면 훈련 모드로 진입합니다.'
      setVoiceUIState(prev => ({
        ...prev,
        displayedText: message,
        showRecognizedText: true,
      }))

      const timer = setTimeout(() => {
        setVoiceUIState(prev => ({
          ...prev,
          showRecognizedText: false,
        }))
      }, PHOTO_SEQUENCE_TIMERS.FADE_OUT)

      return () => clearTimeout(timer)
    }
  }, [voiceEnabled, isLocked])

  // 인식된 텍스트 표시 및 자동 페이드 아웃
  useEffect(() => {
    if (lastRecognized) {
      setVoiceUIState({
        displayedText: lastRecognized,
        showRecognizedText: true,
        matchedItemText: '',
      })

      const timer = setTimeout(() => {
        setVoiceUIState(prev => ({
          ...prev,
          showRecognizedText: false,
          matchedItemText: '', // 페이드 아웃 후 초기화
        }))
      }, PHOTO_SEQUENCE_TIMERS.FADE_OUT)

      return () => clearTimeout(timer)
    }
  }, [lastRecognized])

  // 매칭된 카드 제목 표시 (즉시)
  useEffect(() => {
    if (voiceUIState.matchedItemText) {
      setVoiceUIState(prev => ({
        ...prev,
        displayedText: `✓ ${prev.matchedItemText}`,
        showRecognizedText: true,
      }))
    }
  }, [voiceUIState.matchedItemText])

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
      showHeader={true}
      animateHeader={false}
      hideDivider={true}
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

          {/* 템플릿 선택 (잠금 모드가 아니고 음성인식이 꺼져있을 때만) */}
          {!isLocked && !voiceEnabled ? (
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
            {!isLocked && (
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
                  <DropdownMenuItem onClick={() => setHandlePosition(prev => prev === 'left' ? 'right' : 'left')} className="cursor-pointer">
                    {handlePosition === 'left' ? <ArrowRightToLine className="h-4 w-4 mr-2" /> : <ArrowLeftToLine className="h-4 w-4 mr-2" />}
                    카드핸들 좌우 전환
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setModalStates(prev => ({ ...prev, showTrainingManager: true }))} className="cursor-pointer">
                    <CassetteTape className="h-4 w-4 mr-2" />
                    음성인식 훈련 데이터
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setModalStates(prev => ({ ...prev, showAccuracySettings: true }))} className="cursor-pointer">
                    <Sparkles className="h-4 w-4 mr-2" />
                    음성인식 정확도 설정
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isLocked && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-9 w-9"
                title="모두 초기화"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}
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
        {/* 공통 레이아웃: 상단 컨테이너 + 본문 */}
        <div className="relative flex flex-col h-full">
          {/* 상단 컨테이너 (전체 폭, 확장 가능) - 음성 인식 텍스트 표시 */}
          <div className={`flex items-center justify-center transition-all duration-300 ${voiceEnabled ? 'min-h-[1rem] mb-6' : 'min-h-0'}`}>
            {voiceUIState.displayedText && (
              <div className={`transition-all duration-500 ${voiceUIState.showRecognizedText ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div
                  className={`text-lg font-medium text-center whitespace-nowrap overflow-hidden ${voiceUIState.matchedItemText ? 'text-primary' : 'text-muted-foreground'}`}
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {voiceUIState.displayedText}
                </div>
              </div>
            )}
          </div>

          {/* 락 모드에 따른 본문 레이아웃 분기 */}
          {isLocked ? (
            <>
            {/* 락 모드: 좌우 분할 레이아웃 (6:4 비율) */}
            <div className="flex gap-4 flex-1">
              {/* 왼쪽: 카드 리스트 (60%) */}
              <div className="flex-[3] overflow-y-auto space-y-2 pr-1">
                <CardListContent
                  activeItems={activeItems}
                  sensors={sensors}
                  isLocked={isLocked}
                  voiceEnabled={voiceEnabled}
                  handlePosition={handlePosition}
                  trainingTargetId={trainingState.targetId}
                  collectedPhrasesLength={trainingState.collectedPhrases.length}
                  expandedTrainingId={trainingState.expandedId}
                  collectedPhrases={trainingState.collectedPhrases}
                  onDragEnd={handleDragEnd}
                  onToggleComplete={toggleComplete}
                  onDelete={deleteItem}
                  onStartTraining={startTraining}
                  onSaveTraining={saveTrainingData}
                  onCancelTraining={() => {
                    setTrainingState(prev => ({
                      ...prev,
                      expandedId: null,
                      collectedPhrases: [],
                    }))
                  }}
                />
              </div>

              {/* 오른쪽: 정보 패널 (시계) (40%) */}
              <div className="flex-[2] flex flex-col items-center justify-start pt-8 gap-6">
                {/* 시계 표시 */}
                {clockState.currentTime && (
                  <>
                    <div className="flex items-start" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 300 }}>
                      <span className="text-4xl">
                        {clockState.currentTime.split(':')[0]}
                      </span>
                      <span className="text-4xl opacity-30 mx-1">:</span>
                      <span className="text-6xl tracking-wider">
                        {clockState.currentTime.split(':')[1]}
                      </span>
                    </div>

                    {/* 원형 진행바 (초) */}
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                        {/* 배경 원 */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-muted-foreground/20"
                        />
                        {/* 진행 원 */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="text-foreground/50 transition-all duration-1000 ease-linear"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - clockState.currentSeconds / 60)}`}
                        />
                      </svg>
                      {/* 중앙 초 숫자 */}
                      <div
                        className="absolute inset-0 flex items-center justify-center text-2xl font-light"
                        style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 300 }}
                      >
                        {String(clockState.currentSeconds).padStart(2, '0')}
                      </div>
                    </div>

                    {/* 종료 시간 및 남은 시간 */}
                    <div className="flex justify-center">
                      <div className="space-y-3 text-center">
                        {/* 종료 시간 */}
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">종료 시간</div>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-medium">{clockState.endTime}</span>
                            <Select value={String(shootingDuration)} onValueChange={(value) => handleShootingDurationChange(Number(value))}>
                              <SelectTrigger className="w-auto h-5 px-1 border-0 bg-transparent hover:bg-accent focus:ring-0">
                                <Clock className="h-3.5 w-3.5" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>예식 간격</SelectLabel>
                                  <SelectSeparator />
                                  <SelectItem value="60">1시간</SelectItem>
                                  <SelectItem value="70">1시간 10분</SelectItem>
                                  <SelectItem value="80">1시간 20분</SelectItem>
                                  <SelectItem value="90">1시간 30분</SelectItem>
                                  <SelectItem value="100">1시간 40분</SelectItem>
                                  <SelectItem value="120">2시간</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 구분선 */}
                        <div className="border-t border-muted w-20 mx-auto" />

                        {/* 남은 시간 */}
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">남은 시간</div>
                          <div className="flex items-baseline justify-center gap-1">
                            {clockState.remainingTime.includes('분') ? (
                              <>
                                {(() => {
                                  const minutes = parseInt(clockState.remainingTime.replace('분', ''))
                                  const isWarning = minutes < 10
                                  return (
                                    <>
                                      <span
                                        className={`text-2xl ${isWarning ? 'font-bold bg-black text-yellow-400 px-2 rounded' : 'font-light'}`}
                                        style={!isWarning ? { fontFamily: "'Rajdhani', sans-serif", fontWeight: 300 } : { fontFamily: "'Rajdhani', sans-serif" }}
                                      >
                                        {minutes}
                                      </span>
                                      <span className="font-medium">분</span>
                                    </>
                                  )
                                })()}
                              </>
                            ) : (
                              <span className="font-medium">{clockState.remainingTime}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </>
                )}
              </div>
            </div>

            {/* 중요 내용 - 하단 중앙 플로팅 버튼/카드 */}
            {schedule.photoNote?.importantMemo && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
                {/* 항상 렌더링하되 조건부 스타일 적용 */}
                <div className={`relative bg-background border shadow-xl rounded-full transition-all duration-300 ease-out ${
                  modalStates.showImportantMemo
                    ? 'py-4 pl-4 pr-2 w-[300px] max-w-[90vw] opacity-100 scale-100'
                    : 'p-3 w-auto opacity-100 scale-100 cursor-pointer hover:scale-110'
                }`}
                onClick={() => !modalStates.showImportantMemo && setModalStates(prev => ({ ...prev, showImportantMemo: true }))}
                >
                  {modalStates.showImportantMemo ? (
                    <>
                      {/* 닫기 버튼 - 오른쪽 상단 모서리 바깥쪽 */}
                      <button
                        onClick={() => setModalStates(prev => ({ ...prev, showImportantMemo: false }))}
                        className="absolute -top-2 -right-2 bg-background rounded-full p-1.5 shadow-md border transition-all duration-300 hover:scale-110 z-10"
                        title="닫기"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* 내용 - 체크 아이콘 + 텍스트 */}
                      <div className="flex items-start gap-2.5">
                        <Check className="h-[1.1rem] w-[1.1rem] text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed flex-1">
                          {schedule.photoNote.importantMemo}
                        </div>
                      </div>
                    </>
                  ) : (
                    // 닫힌 상태: 아이콘만
                    <Check className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
              </div>
            )}
            </>
          ) : (
          // 일반 모드: 단일 컬럼 레이아웃
          <>
            <CardListContent
              activeItems={activeItems}
              sensors={sensors}
              isLocked={isLocked}
              voiceEnabled={voiceEnabled}
              handlePosition={handlePosition}
              trainingTargetId={trainingState.targetId}
              collectedPhrasesLength={trainingState.collectedPhrases.length}
              expandedTrainingId={trainingState.expandedId}
              collectedPhrases={trainingState.collectedPhrases}
              onDragEnd={handleDragEnd}
              onToggleComplete={toggleComplete}
              onDelete={deleteItem}
              onStartTraining={startTraining}
              onSaveTraining={saveTrainingData}
              onCancelTraining={() => {
                setTrainingState(prev => ({
                  ...prev,
                  expandedId: null,
                  collectedPhrases: [],
                }))
              }}
            />

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
        </div>
    </ContentModal>

      {/* 훈련 데이터 관리 다이얼로그 */}
      <TrainingDataManager
        open={modalStates.showTrainingManager}
        onOpenChange={(open) => setModalStates(prev => ({ ...prev, showTrainingManager: open }))}
        trainingData={trainingData}
        onSave={handleSaveTrainingManager}
        items={activeItems}
      />

      {/* 브라우저 미지원 알림 */}
      <AlertDialog
        open={modalStates.voiceNotSupportedOpen}
        onOpenChange={(open) => setModalStates(prev => ({ ...prev, voiceNotSupportedOpen: open }))}
        title="음성 인식 지원 안 됨"
        description="현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari 등의 브라우저를 사용해주세요."
      />

      {/* 음성인식 정확도 설정 다이얼로그 */}
      <ContentModal
        open={modalStates.showAccuracySettings}
        onOpenChange={(open) => setModalStates(prev => ({ ...prev, showAccuracySettings: open }))}
        size="md"
        title="음성인식 정확도 설정"
        showFooter={true}
        footerContent={
          <div className="flex justify-end w-full">
            <Button onClick={() => setModalStates(prev => ({ ...prev, showAccuracySettings: false }))}>
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
