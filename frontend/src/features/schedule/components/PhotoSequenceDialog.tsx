import { ContentModal } from '@/components/common/ContentModal'
import { AlertDialog } from '@/components/common/AlertDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Schedule, PhotoSequenceItem } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect, useRef } from 'react'
import { Plus, RotateCcw, Lock, Unlock, Mic, MicOff, CassetteTape, X } from 'lucide-react'
import { generatePhotoSequence } from '../constants/photoSequenceTemplates'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { DEFAULT_VOICE_TRAINING, type VoiceTrainingData } from '../types/voiceRecognition'
import { PHOTO_SEQUENCE_STORAGE_KEYS, PHOTO_SEQUENCE_TIMERS, PHOTO_SEQUENCE_DRAG } from '@/lib/constants/photoSequence'
import { useLocalStorage, useLocalStorageString } from '@/lib/hooks/useLocalStorage'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

  const [items, setItems] = useState<PhotoSequenceItem[]>(() =>
    schedule.photoSequence || generatePhotoSequence()
  )
  const [newItemText, setNewItemText] = useState('')
  const [isLocked, setIsLocked] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.LOCKED, false)
  const [voiceEnabled, setVoiceEnabled] = useLocalStorage(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_ENABLED, false)

  const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null)
  const [collectedPhrases, setCollectedPhrases] = useState<string[]>([])
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null)
  const [showTrainingManager, setShowTrainingManager] = useState(false)
  const [voiceNotSupportedOpen, setVoiceNotSupportedOpen] = useState(false)
  const [showVoiceHintDialog, setShowVoiceHintDialog] = useState(false)
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
      setItems(schedule.photoSequence || generatePhotoSequence())
    }
  }, [open])  // open만 의존성으로 설정

  // schedule.photoSequence가 변경되면 items 업데이트
  useEffect(() => {
    if (open && schedule.photoSequence) {
      setItems(schedule.photoSequence)
    }
  }, [schedule.photoSequence])

  // 활성 항목과 삭제된 항목 분리
  const activeItems = items.filter(item => !item.deleted)
  const deletedItems = items.filter(item => item.deleted)

  // 실시간 저장
  const saveToServer = (updatedItems: PhotoSequenceItem[]) => {
    updateSchedule.mutate({
      id: schedule.id,
      photoSequence: updatedItems,
    })
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

    // 음성 인식을 켜려고 할 때 힌트 표시 (한 번만)
    const hintDismissed = localStorage.getItem(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_HINT_DISMISSED)
    if (!voiceEnabled && !hintDismissed) {
      setShowVoiceHintDialog(true)
      return
    }

    setVoiceEnabled((prev) => !prev)
  }

  // 힌트 다이얼로그 확인 후 음성 인식 켜기
  const handleVoiceHintConfirm = () => {
    setVoiceEnabled(true)
  }

  // 다시 알리지 않기 체크 시
  const handleDontAskAgain = (checked: boolean) => {
    if (checked) {
      localStorage.setItem(PHOTO_SEQUENCE_STORAGE_KEYS.VOICE_HINT_DISMISSED, 'true')
    }
  }

  // 훈련 모드 시작
  const startTraining = (itemId: string) => {
    setTrainingTargetId(itemId)
    setCollectedPhrases([])
    setExpandedTrainingId(null)
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
    onMatch: handleVoiceMatch,
    onCollect: handleVoiceCollect,
  })

  // 음성 끄면 훈련 종료
  useEffect(() => {
    if (!voiceEnabled && trainingTargetId) {
      endTraining()
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

  return (
    <>
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="md:max-w-2xl md:min-w-[500px] md:h-[90vh]"
      title=" "
      headerAction={
        <div className="flex items-center gap-1">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTrainingManager(true)}
            className="h-9 w-9"
            title="훈련 데이터 관리"
          >
            <CassetteTape className="h-5 w-5" />
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-9 w-9"
            title="모두 초기화"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
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

        {/* 음성 인식 상태 영역 */}
        {voiceEnabled && displayedText && (
          <div className="border-b pb-4">
            {/* 인식된 텍스트 표시 */}
            <div className={`text-center transition-opacity duration-500 ease-in-out ${showRecognizedText ? 'opacity-100' : 'opacity-0'}`}>
              <div className={`text-xl font-semibold ${matchedItemText ? 'text-foreground' : 'text-muted-foreground'}`}>
                {displayedText}
              </div>
            </div>
          </div>
        )}

        {/* 체크리스트 */}
        <div className="space-y-4">
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

        {/* 삭제된 항목 배지 */}
        {!isLocked && deletedItems.length > 0 && (
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

      {/* 음성 인식 힌트 */}
      <AlertDialog
        open={showVoiceHintDialog}
        onOpenChange={setShowVoiceHintDialog}
        title="음성 인식 사용 안내"
        description="음성 인식 도중에 카드를 길게 누르면 훈련 모드로 진입합니다."
        onConfirm={handleVoiceHintConfirm}
        showDontAskAgain={true}
        onDontAskAgainChange={handleDontAskAgain}
      />
    </>
  )
}
