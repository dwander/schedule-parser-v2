import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Schedule, PhotoSequenceItem } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, GripVertical, ArrowLeft, RotateCcw, X, Lock, Unlock, Mic, MicOff, CassetteTape } from 'lucide-react'
import { generatePhotoSequence } from '../constants/photoSequenceTemplates'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { DEFAULT_VOICE_TRAINING, type VoiceTrainingData } from '../types/voiceRecognition'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
  const [items, setItems] = useState<PhotoSequenceItem[]>(() =>
    schedule.photoSequence || generatePhotoSequence()
  )
  const [newItemText, setNewItemText] = useState('')
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('photoSequenceLocked')
    return saved ? JSON.parse(saved) : false
  })
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('photoSequenceVoiceEnabled')
    return saved ? JSON.parse(saved) : false
  })
  const [trainingData, setTrainingData] = useState<VoiceTrainingData>(() => {
    const saved = localStorage.getItem('photoSequenceVoiceTraining')
    return saved ? JSON.parse(saved) : DEFAULT_VOICE_TRAINING
  })
  const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null)
  const [collectedPhrases, setCollectedPhrases] = useState<string[]>([])
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null)
  const [showTrainingManager, setShowTrainingManager] = useState(false)

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
    setIsLocked(prev => {
      const newValue = !prev
      localStorage.setItem('photoSequenceLocked', JSON.stringify(newValue))
      return newValue
    })
  }

  // 음성 인식 토글
  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const newValue = !prev
      localStorage.setItem('photoSequenceVoiceEnabled', JSON.stringify(newValue))
      return newValue
    })
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

  // 훈련 데이터 저장
  const saveTrainingData = (itemText: string, selectedPhrases: string[]) => {
    const newTrainingData = {
      ...trainingData,
      [itemText]: selectedPhrases,
    }
    setTrainingData(newTrainingData)
    localStorage.setItem('photoSequenceVoiceTraining', JSON.stringify(newTrainingData))
    setExpandedTrainingId(null)
    setCollectedPhrases([])
  }

  // 음성 인식 매칭 콜백
  const handleVoiceMatch = (itemText: string) => {
    // 훈련 모드가 아닐 때만 자동 체크
    if (!trainingTargetId) {
      const matchedItem = items.find(item => !item.deleted && item.text === itemText)
      if (matchedItem && !matchedItem.completed) {
        toggleComplete(matchedItem.id)
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
  const { isListening, lastRecognized } = useVoiceRecognition({
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

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 핸들러
  const handleDragEnd = (event: any) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 md:inset-auto left-0 top-0 md:left-[50%] md:top-[50%] translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] max-w-none md:max-w-2xl w-full md:w-auto md:min-w-[500px] h-full md:h-[90vh] p-0 flex flex-col rounded-none md:rounded-lg border-0 md:border [&>button]:hidden">
        {/* 헤더 */}
        <div className="flex flex-row items-center justify-between px-4 py-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`h-9 w-9 ${voiceEnabled ? 'text-red-500' : ''}`}
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
              className="h-9 w-9"
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
        </div>

        {/* 체크리스트 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
        {deletedItems.length > 0 && (
          <div className="mx-4 mb-3 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
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
          </div>
        )}

        {/* 음성 인식 상태 */}
        {voiceEnabled && (isListening || lastRecognized) && (
          <div className="mx-4 mb-2 flex-shrink-0">
            <div className="px-3 py-2 rounded-lg bg-muted/50 flex items-center gap-2 text-sm">
              {isListening && (
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                  <span className="text-muted-foreground">듣는 중...</span>
                </span>
              )}
              {lastRecognized && (
                <span className="text-muted-foreground flex-1 truncate">
                  &ldquo;{lastRecognized}&rdquo;
                </span>
              )}
            </div>
          </div>
        )}

        {/* 항목 추가 */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
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
        </div>
      </DialogContent>
    </Dialog>

      {/* 훈련 데이터 관리 다이얼로그 */}
      <TrainingDataManager
        open={showTrainingManager}
        onOpenChange={setShowTrainingManager}
        trainingData={trainingData}
        onSave={(newData) => {
          setTrainingData(newData)
          localStorage.setItem('photoSequenceVoiceTraining', JSON.stringify(newData))
        }}
        items={activeItems}
      />
    </>
  )
}

// 정렬 가능한 아이템 컴포넌트
interface SortableItemProps {
  item: PhotoSequenceItem
  isLocked: boolean
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  trainingTargetId: string | null
  collectedCount: number
  isExpanded: boolean
  collectedPhrases: string[]
  onStartTraining: (id: string) => void
  onSaveTraining: (itemText: string, phrases: string[]) => void
  onCancelTraining: () => void
}

function SortableItem({
  item,
  isLocked,
  onToggleComplete,
  onDelete,
  trainingTargetId,
  collectedCount,
  isExpanded,
  collectedPhrases: initialPhrases,
  onStartTraining,
  onSaveTraining,
  onCancelTraining,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isLocked })

  const [editablePhrases, setEditablePhrases] = useState<string[]>([])
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // 펼쳐질 때 편집 가능한 복사본 생성
  useEffect(() => {
    if (isExpanded) {
      setEditablePhrases([...initialPhrases])
    }
  }, [isExpanded, initialPhrases])

  const handlePointerDown = () => {
    if (!isLocked && !trainingTargetId) {
      longPressTimer.current = setTimeout(() => {
        onStartTraining(item.id)
      }, 500) // 500ms 롱프레스
    }
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleRemovePhrase = (index: number) => {
    setEditablePhrases(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (editablePhrases.length > 0) {
      onSaveTraining(item.text, editablePhrases)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  const isTraining = trainingTargetId === item.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        onClick={() => !isTraining && onToggleComplete(item.id)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer group origin-right transition-[transform,opacity] duration-[250ms] ease-out will-change-transform ${
          item.completed ? 'scale-[0.83] opacity-50' : 'scale-100 opacity-100'
        } ${isTraining ? 'ring-2 ring-red-500' : ''}`}
      >
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`flex-shrink-0 ${isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 text-base select-none flex items-center gap-2">
          <span>{item.text}</span>
          {isTraining && (
            <Badge variant="destructive" className="ml-2">
              🎯 {collectedCount}개
            </Badge>
          )}
        </div>

        {!isLocked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 펼쳐진 훈련 데이터 */}
      {isExpanded && editablePhrases.length > 0 && (
        <div className="mt-2 ml-12 p-3 rounded-lg border bg-muted/30">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            수집된 문장 ({editablePhrases.length}개)
          </div>
          <div className="space-y-1 mb-3">
            {editablePhrases.map((phrase, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{phrase}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemovePhrase(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              {editablePhrases.length}개 저장
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelTraining}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 훈련 데이터 관리 컴포넌트
interface TrainingDataManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainingData: VoiceTrainingData
  onSave: (data: VoiceTrainingData) => void
  items: PhotoSequenceItem[]
}

function TrainingDataManager({ open, onOpenChange, trainingData, onSave, items }: TrainingDataManagerProps) {
  const [editingData, setEditingData] = useState<VoiceTrainingData>(trainingData)
  const [newKeywords, setNewKeywords] = useState<{ [itemText: string]: string }>({})
  const [editingKeyword, setEditingKeyword] = useState<{ itemText: string; index: number } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // 다이얼로그가 열릴 때 데이터 초기화
  useEffect(() => {
    if (open) {
      setEditingData({ ...trainingData })
      setNewKeywords({})
      setEditingKeyword(null)
    }
  }, [open, trainingData])

  const handleAddKeyword = (itemText: string) => {
    const keyword = newKeywords[itemText]?.trim()
    if (!keyword) return

    setEditingData(prev => ({
      ...prev,
      [itemText]: [...(prev[itemText] || []), keyword],
    }))
    setNewKeywords(prev => ({ ...prev, [itemText]: '' }))
  }

  const handleRemoveKeyword = (itemText: string, keywordIndex: number) => {
    setEditingData(prev => ({
      ...prev,
      [itemText]: prev[itemText].filter((_, i) => i !== keywordIndex),
    }))
  }

  const handleStartEdit = (itemText: string, index: number, currentValue: string) => {
    setEditingKeyword({ itemText, index })
    setEditingValue(currentValue)
  }

  const handleSaveEdit = () => {
    if (!editingKeyword || !editingValue.trim()) {
      setEditingKeyword(null)
      return
    }

    setEditingData(prev => ({
      ...prev,
      [editingKeyword.itemText]: prev[editingKeyword.itemText].map((kw, i) =>
        i === editingKeyword.index ? editingValue.trim() : kw
      ),
    }))
    setEditingKeyword(null)
    setEditingValue('')
  }

  const handleCancelEdit = () => {
    setEditingKeyword(null)
    setEditingValue('')
  }

  const handleReset = () => {
    setEditingData({ ...DEFAULT_VOICE_TRAINING })
  }

  const handleSave = () => {
    onSave(editingData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>훈련 데이터 관리</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="font-medium mb-3">{item.text}</div>
                <div className="space-y-2 mb-3">
                  {(editingData[item.text] || []).map((keyword, index) => {
                    const isEditing = editingKeyword?.itemText === item.text && editingKeyword?.index === index

                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEdit()
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="flex-1 h-8"
                          />
                        ) : (
                          <span
                            className="flex-1 px-2 py-1 bg-muted rounded cursor-pointer hover:bg-muted/70"
                            onClick={() => handleStartEdit(item.text, index, keyword)}
                          >
                            {keyword}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveKeyword(item.text, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="새 키워드 추가..."
                    value={newKeywords[item.text] || ''}
                    onChange={(e) =>
                      setNewKeywords(prev => ({ ...prev, [item.text]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKeyword(item.text)
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleAddKeyword(item.text)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
          <div className="flex-1"></div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
